function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(response => response.json())
    .then(data => {
      if (data.isAdmin) {
        document.getElementById('admin-panel').classList.remove('hidden');
        document.getElementById('user-panel').classList.add('hidden');
      } else {
        document.getElementById('user-panel').classList.remove('hidden');
        document.getElementById('admin-panel').classList.add('hidden');
      }
      alert('Успішний вхід!');
    })
    .catch(err => {
      console.error('Помилка входу:', err);
      alert('Неправильний логін або пароль.');
    });
}

function addUser() {
  const username = prompt('Введіть ім’я нового користувача:');
  if (!username) return;

  fetch('/admin/add-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  })
    .then(response => response.text())
    .then(message => alert(message))
    .catch(err => console.error('Помилка додавання користувача:', err));
}

function blockUser() {
  const username = prompt('Введіть ім’я користувача для блокування:');
  if (!username) return;

  fetch('/admin/block-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  })
    .then(response => response.text())
    .then(message => alert(message))
    .catch(err => console.error('Помилка блокування користувача:', err));
}

function viewUsers() {
  fetch('/admin/users')
    .then(response => response.json())
    .then(users => {
      let output = 'Список користувачів:\n';
      users.forEach(user => {
        output += `${user.username} (Заблокований: ${user.isBlocked}, Обмеження пароля: ${user.passwordRestrictions})\n`;
      });
      alert(output);
    })
    .catch(err => console.error('Помилка перегляду користувачів:', err));
}

function setPasswordRestrictions() {
  const username = prompt('Введіть ім’я користувача:');
  if (!username) return;

  const restrictions = confirm('Ввімкнути обмеження на паролі?');

  fetch('/admin/set-password-restrictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, restrictions })
  })
    .then(response => response.text())
    .then(message => alert(message))
    .catch(err => console.error('Помилка керування обмеженнями:', err));
}

function changePassword() {
  const oldPassword = prompt('Введіть старий пароль:');
  const newPassword = prompt('Введіть новий пароль:');

  fetch('/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: document.getElementById('username').value, oldPassword, newPassword })
  })
    .then(response => response.text())
    .then(message => alert(message))
    .catch(err => console.error('Помилка зміни пароля:', err));
}

function checkKey() {
  const key = prompt('Введіть ключ:');  // Діалогове вікно для введення ключа

  fetch('/check-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  })
    .then(response => response.text())
    .then(message => {
      if (message === 'Ключ вірний!') {
        alert('Доступ надано!');
      } else {
        alert('Невірний ключ!');
      }
    })
    .catch(err => {
      console.error('Помилка перевірки ключа:', err);
      alert('Помилка перевірки ключа.');
    });
}
