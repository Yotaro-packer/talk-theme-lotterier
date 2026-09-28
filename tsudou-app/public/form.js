const form = document.getElementById('themeForm');
const textInput = document.getElementById('themeText');
const message = document.getElementById('message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = textInput.value.trim();
  if (!text) return;

  try {
    const res = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? '投稿に失敗しました');
    }

    textInput.value = '';
    message.textContent = '投稿しました。ありがとうございます！';
    message.classList.remove('error');
  } catch (err) {
    message.textContent = err.message;
    message.classList.add('error');
  }
});
