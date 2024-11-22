const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Шлях до файлу користувачів
const USERS_FILE = './users.json';
const LOGS_DIR = './logs';
const REGISTRATION_LOG = path.join(LOGS_DIR, 'registration.log');
const OPERATION_LOG = path.join(LOGS_DIR, 'operation.log');

// Створюємо папку logs, якщо вона не існує
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

// Функція для хешування пароля за допомогою a*sin(1/x)
function hashPassword(password) {
  const a = 1000;
  if (!password || typeof password !== 'string' || password.trim() === '') {
    return ''; // Якщо пароль порожній або не рядок, повертаємо порожній хеш
  }
  const x = password.length; // Використовуємо довжину пароля як x
  const hash = a * Math.sin(1 / x); // Формула хешування
  return hash.toString(); // Повертаємо хеш як рядок
}

// Завантаження користувачів з файлу
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    return [{ 
      username: 'ADMIN', 
      password: '123', 
      truePassword: "ADMIN",
      isAdmin: true, 
      isBlocked: false, 
      passwordRestrictions: false, 
      failedAttempts: 0 
    }];
  }
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

// Збереження користувачів у файл
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Логування вхід/вихід користувачів
function logRegistration(username, action) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${username} ${action}\n`;
  fs.appendFileSync(REGISTRATION_LOG, logMessage);
}

// Логування дій користувачів
function logOperation(username, action) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${username} ${action}\n`;
  fs.appendFileSync(OPERATION_LOG, logMessage);
}

// Віддаємо статичні файли з папки (наприклад, HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Головна сторінка
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обробка логіна
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(404).send('Користувача не знайдено.');
  if (user.isBlocked) return res.status(403).send('Користувача заблоковано.');

  // Перевіряємо пароль (якщо пароль хешований, порівнюємо хеші)
  const hashedPassword = hashPassword(password);
  if (user.password !== hashedPassword && user.password !== password) {
    user.failedAttempts++;
    if (user.failedAttempts >= 3) {
      user.isBlocked = true;
      saveUsers(users);
      return res.status(403).send('Користувача заблоковано через 3 невдалі спроби.');
    }
    saveUsers(users);
    return res.status(401).send(`Неправильний пароль. Спроба: ${user.failedAttempts}`);
  }

  user.failedAttempts = 0;
  saveUsers(users);
  
  // Логування успішного входу
  logRegistration(username, 'ввійшов в систему');
  
  res.json({ isAdmin: user.isAdmin });
});

// Додавання користувача (адміністратор)
app.post('/admin/add-user', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  
  if (users.some(user => user.username === username)) {
    return res.status(400).send('Користувач із таким ім\'ям вже існує.');
  }

  const hashedPassword = hashPassword(password);  // Хешуємо пароль

  users.push({
    username,
    password: hashedPassword,  // Зберігаємо хешований пароль
    isAdmin: false,
    isBlocked: false,
    passwordRestrictions: false,
    failedAttempts: 0
  });

  saveUsers(users);
  
  // Логування додавання користувача
  logOperation(req.body.username, `додав користувача ${username}`);
  
  res.send('Користувача додано.');
});

// Блокування користувача
app.post('/admin/block-user', (req, res) => {
  const { username } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(404).send('Користувача не знайдено.');
  
  user.isBlocked = true;
  saveUsers(users);
  
  // Логування блокування користувача
  logOperation(req.body.username, `заблокував користувача ${username}`);
  
  res.send(`Користувача ${username} заблоковано.`);
});

// Перегляд всіх користувачів
app.get('/admin/users', (req, res) => {
  const users = loadUsers();
  res.json(users);
});

// Установка обмежень на паролі
app.post('/admin/set-password-restrictions', (req, res) => {
  const { username, restrictions } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(404).send('Користувача не знайдено.');

  user.passwordRestrictions = restrictions;
  saveUsers(users);
  
  // Логування зміни обмежень на пароль
  logOperation(req.body.username, `змінив обмеження на пароль для ${username}`);
  
  res.send(`Обмеження на пароль для ${username} ${restrictions ? 'ввімкнено' : 'вимкнено'}.`);
});

// Зміна пароля
app.post('/change-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(404).send('Користувача не знайдено.');

  const oldHashedPassword = hashPassword(oldPassword);
  if (user.password !== oldHashedPassword && user.password !== oldPassword) {
    return res.status(401).send('Неправильний старий пароль.');
  }

  if (user.passwordRestrictions && !/[a-zA-Z]/.test(newPassword) || !/[а-яА-ЯёЁ]/.test(newPassword)) {
    return res.status(400).send('Пароль має містити як латинські, так і кириличні літери.');
  }
  
  user.password = hashPassword(newPassword);  // Хешуємо новий пароль
  user.truePassword = newPassword;  // Зберігаємо новий справжній пароль

  saveUsers(users);

  // Логування зміни пароля
  logOperation(req.body.username, `змінив пароль користувача ${username}`);
  
  res.send('Пароль успішно змінено.');
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер працює на http://localhost:${PORT}`));
