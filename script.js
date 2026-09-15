(function () {
  // Baidu Analytics
  var _hmt = _hmt || [];
  (function () {
    var hm = document.createElement('script');
    hm.src = 'https://hm.baidu.com/hm.js?8cede766e3f05f013ec9f92f13d03a16';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(hm, s);
  })();

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

  // Device IP query form
  const queryForm = document.getElementById('query-form');
  const queryResult = document.getElementById('query-result');
  const queryResultContent = document.getElementById('query-result-content');

  if (queryForm && queryResult && queryResultContent) {
    queryForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const readKey = queryForm.querySelector('[name="read_key"]').value.trim();
      if (!readKey) return;

      queryResult.classList.remove('hidden');
      queryResultContent.innerHTML = '<p class="empty">查询中...</p>';

      try {
        const response = await fetch(`/api/devices/${encodeURIComponent(readKey)}`);
        if (!response.ok) {
          if (response.status === 404) {
            queryResultContent.innerHTML = '<p class="empty">未找到该设备，请检查 read_key 是否正确。</p>';
          } else {
            queryResultContent.innerHTML = `<p class="error">查询失败（状态码 ${response.status}）</p>`;
          }
          return;
        }

        const data = await response.json();
        const ipv6 = data.ipv6 || '无';
        const ipv4 = data.ipv4 || '无';
        const deviceName = data.device_name || readKey.slice(0, 8);
        const updatedAt = data.updated_at
          ? new Date(data.updated_at).toLocaleString('zh-CN')
          : '未知';

        queryResultContent.innerHTML = `
          <dl>
            <dt>设备名</dt><dd>${escapeHtml(deviceName)}</dd>
            <dt>read_key</dt><dd>${escapeHtml(data.read_key || readKey)}</dd>
            <dt>IPv6</dt><dd>${escapeHtml(ipv6)}</dd>
            <dt>IPv4</dt><dd>${escapeHtml(ipv4)}</dd>
            <dt>更新时间</dt><dd>${escapeHtml(updatedAt)}</dd>
          </dl>
        `;
      } catch (err) {
        queryResultContent.innerHTML = `<p class="error">查询出错：${escapeHtml(err.message)}</p>`;
      }
    });
  }

  // Generate read_key / write_key pair with QR code
  const generateKeysBtn = document.getElementById('generate-keys');
  const keysResult = document.getElementById('keys-result');
  const keysResultContent = document.getElementById('keys-result-content');
  const qrcodeContainer = document.getElementById('qrcode-container');

  if (generateKeysBtn && keysResult && keysResultContent && qrcodeContainer) {
    generateKeysBtn.addEventListener('click', () => {
      const readKey = generateUuid();
      const writeKey = generateUuid();
      const shareUrl = `${window.location.origin}/?read_key=${encodeURIComponent(readKey)}`;

      keysResult.classList.remove('hidden');
      keysResultContent.innerHTML = `
        <div class="key-row">
          <label>read_key（查询 / 分享用）</label>
          <code>${escapeHtml(readKey)}</code>
        </div>
        <div class="key-row">
          <label>write_key（仅小软件更新用，请勿分享）</label>
          <code>${escapeHtml(writeKey)}</code>
        </div>
        <p class="empty">扫描二维码即可查询该设备 IP。</p>
      `;

      qrcodeContainer.innerHTML = '';
      // eslint-disable-next-line no-undef
      new QRCode(qrcodeContainer, {
        text: shareUrl,
        width: 180,
        height: 180,
        colorDark: '#1f2937',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    });
  }

  // Check my public IP
  const checkMyIpBtn = document.getElementById('check-my-ip');
  const myipResult = document.getElementById('myip-result');
  const myipResultContent = document.getElementById('myip-result-content');

  if (checkMyIpBtn && myipResult && myipResultContent) {
    checkMyIpBtn.addEventListener('click', async () => {
      myipResult.classList.remove('hidden');
      myipResultContent.innerHTML = '<p class="empty">检测中...</p>';

      try {
        const response = await fetch('/api/myip');
        if (!response.ok) {
          myipResultContent.innerHTML = `<p class="error">检测失败（状态码 ${response.status}）</p>`;
          return;
        }

        const data = await response.json();
        myipResultContent.innerHTML = `
          <dl>
            <dt>公网 IP</dt><dd>${escapeHtml(data.ip)}</dd>
            <dt>协议版本</dt><dd>${escapeHtml(data.version)}</dd>
          </dl>
          <p class="empty" style="margin-top:0.75rem">如果你看到的是 IPv6，说明当前网络支持 IPv6。</p>
        `;
      } catch (err) {
        myipResultContent.innerHTML = `<p class="error">检测出错：${escapeHtml(err.message)}</p>`;
      }
    });
  }

  // Browser-side IP monitor
  const monitorForm = document.getElementById('monitor-form');
  const monitorToggle = document.getElementById('monitor-toggle');
  const monitorResult = document.getElementById('monitor-result');
  const monitorResultContent = document.getElementById('monitor-result-content');

  let monitorTimer = null;
  let isMonitoring = false;
  const MONITOR_INTERVAL_MS = 30 * 1000;

  if (monitorForm && monitorToggle && monitorResult && monitorResultContent) {
    monitorForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (isMonitoring) {
        stopMonitor();
        return;
      }

      const readKey = monitorForm.querySelector('[name="read_key"]').value.trim();
      const writeKey = monitorForm.querySelector('[name="write_key"]').value.trim();
      const deviceName = monitorForm.querySelector('[name="device_name"]').value.trim();

      if (!readKey || !writeKey) return;

      startMonitor(readKey, writeKey, deviceName);
    });
  }

  function startMonitor(readKey, writeKey, deviceName) {
    isMonitoring = true;
    monitorToggle.textContent = '关闭监听';
    monitorToggle.classList.remove('btn-primary');
    monitorToggle.classList.add('btn-secondary');
    monitorResult.classList.remove('hidden');

    const inputs = monitorForm.querySelectorAll('input');
    inputs.forEach((input) => {
      input.dataset.wasDisabled = input.disabled;
      input.disabled = true;
    });

    reportCurrentIp(readKey, writeKey, deviceName);
    monitorTimer = setInterval(() => {
      reportCurrentIp(readKey, writeKey, deviceName);
    }, MONITOR_INTERVAL_MS);
  }

  function stopMonitor() {
    isMonitoring = false;
    if (monitorTimer) {
      clearInterval(monitorTimer);
      monitorTimer = null;
    }

    monitorToggle.textContent = '开启监听';
    monitorToggle.classList.remove('btn-secondary');
    monitorToggle.classList.add('btn-primary');

    const inputs = monitorForm.querySelectorAll('input');
    inputs.forEach((input) => {
      input.disabled = input.dataset.wasDisabled === 'true';
    });

    monitorResultContent.innerHTML += `
      <p class="empty" style="margin-top:0.75rem">监听已停止。</p>
    `;
  }

  async function reportCurrentIp(readKey, writeKey, deviceName) {
    monitorResultContent.innerHTML = `
      <p class="empty">正在检测并上报... ${new Date().toLocaleTimeString('zh-CN')}</p>
    `;

    try {
      const myipResponse = await fetch('/api/myip');
      if (!myipResponse.ok) {
        throw new Error(`检测失败 ${myipResponse.status}`);
      }
      const myip = await myipResponse.json();

      const payload = {
        read_key: readKey,
        write_key: writeKey,
        device_name: deviceName || readKey.slice(0, 8),
        ipv6: myip.version === 'IPv6' ? myip.ip : '',
        ipv4: myip.version === 'IPv4' ? myip.ip : ''
      };

      const reportResponse = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!reportResponse.ok) {
        const errData = await reportResponse.json().catch(() => ({}));
        throw new Error(errData.error || `上报失败 ${reportResponse.status}`);
      }

      monitorResultContent.innerHTML = `
        <dl>
          <dt>状态</dt><dd>已上报</dd>
          <dt>当前 IP</dt><dd>${escapeHtml(myip.ip)} (${escapeHtml(myip.version)})</dt>
          <dt>时间</dt><dd>${new Date().toLocaleString('zh-CN')}</dd>
        </dl>
      `;
    } catch (err) {
      monitorResultContent.innerHTML = `<p class="error">上报出错：${escapeHtml(err.message)}</p>`;
    }
  }

  function generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = (Math.random() * 16) | 0;
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
})();
