(function () {
  // Mobile navigation toggle
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Copy buttons for code blocks
  document.querySelectorAll('.code-block').forEach((block) => {
    const pre = block.querySelector('pre');
    if (!pre) return;

    const button = document.createElement('button');
    button.className = 'copy-btn';
    button.type = 'button';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');

    button.addEventListener('click', async () => {
      const text = pre.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = '已复制';
        setTimeout(() => {
          button.textContent = '复制';
        }, 1500);
      } catch (err) {
        // Fallback for older browsers or non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          button.textContent = '已复制';
          setTimeout(() => {
            button.textContent = '复制';
          }, 1500);
        } catch (e) {
          button.textContent = '复制失败';
        }
        document.body.removeChild(textarea);
      }
    });

    block.appendChild(button);
  });
})();
