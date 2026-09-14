let count = 0;

function initCounter() {
  const btn = document.getElementById('clickBtn');
  const output = document.getElementById('counter');
  if (!btn || !output) return;

  btn.addEventListener('click', () => {
    count += 1;
    output.textContent = `你点击了 ${count} 次`;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCounter);
} else {
  initCounter();
}
