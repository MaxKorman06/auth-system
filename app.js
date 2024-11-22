const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');  // Додано для хешування
const app = express();

app.use(express.json());

// Шлях до файлу користувачів
const USERS_FILE = './users.json';

// Функція хешування пароля за формулою a * sin(1/x)
function hashPassword(password) {
  // Встановлюємо значення a для хешування
  const a = 1000; 
  // Беремо частину пароля як x
  const x = password.length > 0 ? password.charCodeAt(0) : 1; 
  // Рахуємо значення за формулою
  const hash = a * Math.sin(1 / x);
  return hash.toString();
}

// Завантаження користувачів з файлу
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    return [{ 
      username: 'ADMIN', 
      password: '123', 
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
  saveUsers(users);
  res.send('Пароль успішно змінено.');
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер працює на http://localhost:${PORT}`));
