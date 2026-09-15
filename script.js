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
      const deviceKey = queryForm.querySelector('[name="device_key"]').value.trim();
      if (!deviceKey) return;

      queryResult.classList.remove('hidden');
      queryResultContent.innerHTML = '<p class="empty">查询中...</p>';

      try {
        const response = await fetch(`/api/devices/${encodeURIComponent(deviceKey)}`);
        if (!response.ok) {
          if (response.status === 404) {
            queryResultContent.innerHTML = '<p class="empty">未找到该设备。如果你查询的是本机，请先在“同步本机 IP”区域点击“立即上报一次”或“开启监听”；如果查询的是其他设备，请确认对方已开启同步。</p>';
          } else {
            queryResultContent.innerHTML = `<p class="error">查询失败（状态码 ${response.status}）</p>`;
          }
          return;
        }

        const data = await response.json();
        const ipv6 = data.ipv6 || '无';
        const ipv4 = data.ipv4 || '无';
        const deviceName = data.device_name || deviceKey.slice(0, 8);
        const updatedAt = data.updated_at
          ? new Date(data.updated_at).toLocaleString('zh-CN')
          : '未知';

        const status = getDeviceStatus(data.updated_at);
        queryResultContent.innerHTML = `
          <dl>
            <dt>设备名</dt><dd>${escapeHtml(deviceName)}</dd>
            <dt>device_key</dt><dd>${escapeHtml(data.device_key || deviceKey)} ${copyButtonHtml(data.device_key || deviceKey)}</dd>
            <dt>状态</dt><dd>${statusBadgeHtml(status)}</dd>
            <dt>IPv6</dt><dd>${escapeHtml(ipv6)} ${copyButtonHtml(ipv6)}</dd>
            <dt>IPv4</dt><dd>${escapeHtml(ipv4)} ${copyButtonHtml(ipv4)}</dd>
            <dt>更新时间</dt><dd>${escapeHtml(updatedAt)}</dd>
          </dl>
          <div class="query-actions" style="margin-top: 1rem;">
            <button type="button" class="btn btn-secondary btn-sm save-device" data-key="${escapeHtml(data.device_key || deviceKey)}" data-name="${escapeHtml(deviceName)}">保存到我的设备</button>
          </div>
        `;
      } catch (err) {
        queryResultContent.innerHTML = `<p class="error">查询出错：${escapeHtml(err.message)}</p>`;
      }
    });

    // Handle ?device_key=xxx deep link from QR code share
    const urlParams = new URLSearchParams(window.location.search);
    const sharedDeviceKey = urlParams.get('device_key');
    if (sharedDeviceKey) {
      const sharedInput = queryForm.querySelector('[name="device_key"]');
      if (sharedInput) {
        sharedInput.value = sharedDeviceKey;
        queryForm.dispatchEvent(new Event('submit'));
        // 清理 URL，避免刷新重复触发
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }

  // Device key display and management
  const deviceKeyDisplay = document.getElementById('device-key-display');
  const deviceKeyValue = document.getElementById('device-key-value');
  const deviceKeyQrcode = document.getElementById('device-key-qrcode');
  const regenerateKeyBtn = document.getElementById('regenerate-key');
  const monitorDeviceKeyInput = document.getElementById('monitor-device-key');

  const DEVICE_KEY_STORAGE_KEY = 'ipstun_device_key';
  const DEVICES_LIST_STORAGE_KEY = 'ipstun_devices';

  function setDeviceKey(value) {
    try {
      localStorage.setItem(DEVICE_KEY_STORAGE_KEY, value);
    } catch (e) {
      // localStorage 不可用则忽略
    }
  }

  function getDeviceKey() {
    try {
      return localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function getDevices() {
    try {
      const raw = localStorage.getItem(DEVICES_LIST_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveDevices(devices) {
    try {
      localStorage.setItem(DEVICES_LIST_STORAGE_KEY, JSON.stringify(devices));
    } catch (e) {
      // ignore
    }
  }

  function addDevice(deviceKey, deviceName) {
    const devices = getDevices();
    const exists = devices.some((d) => d.device_key === deviceKey);
    if (exists) return false;

    devices.push({
      device_key: deviceKey,
      device_name: deviceName || deviceKey.slice(0, 8),
      created_at: Date.now()
    });
    saveDevices(devices);
    return true;
  }

  function removeDevice(deviceKey) {
    const devices = getDevices().filter((d) => d.device_key !== deviceKey);
    saveDevices(devices);
  }

  // 暴露给全局，方便其他页面使用
  window.ipstunStorage = {
    getDeviceKey,
    setDeviceKey,
    getDevices,
    saveDevices,
    addDevice,
    removeDevice
  };

  window.ipstunUi = {
    escapeHtml,
    copyButtonHtml,
    getDeviceStatus,
    statusBadgeHtml
  };

  const MASKED_KEY = '••••••••-••••-••••-••••-••••••••••••';

  function renderDeviceKey(deviceKey) {
    if (!deviceKeyDisplay || !deviceKeyValue || !deviceKeyQrcode) return;

    const key = deviceKey || generateUuid();
    const shareUrl = `${window.location.origin}/?device_key=${encodeURIComponent(key)}`;

    deviceKeyDisplay.classList.remove('hidden');
    deviceKeyValue.dataset.key = key;
    deviceKeyValue.textContent = MASKED_KEY;
    deviceKeyQrcode.innerHTML = '';
    // eslint-disable-next-line no-undef
    new QRCode(deviceKeyQrcode, {
      text: shareUrl,
      width: 180,
      height: 180,
      colorDark: '#1f2937',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });

    if (monitorDeviceKeyInput) {
      monitorDeviceKeyInput.value = key;
    }

    setDeviceKey(key);

    return key;
  }

  if (regenerateKeyBtn) {
    regenerateKeyBtn.addEventListener('click', () => {
      renderDeviceKey();
    });
  }

  // Copy share link button
  const copyShareLinkBtn = document.getElementById('copy-share-link');
  if (copyShareLinkBtn) {
    copyShareLinkBtn.addEventListener('click', async () => {
      const key = getDeviceKey();
      if (!key) return;
      const shareUrl = `${window.location.origin}/?device_key=${encodeURIComponent(key)}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        copyShareLinkBtn.textContent = '已复制';
        setTimeout(() => {
          copyShareLinkBtn.textContent = '复制分享链接';
        }, 1500);
      } catch (err) {
        copyShareLinkBtn.textContent = '复制失败';
      }
    });
  }

  // Toggle device key visibility
  const toggleDeviceKeyBtn = document.getElementById('toggle-device-key');
  if (toggleDeviceKeyBtn && deviceKeyValue) {
    toggleDeviceKeyBtn.addEventListener('click', () => {
      const isMasked = deviceKeyValue.textContent === MASKED_KEY;
      if (isMasked) {
        deviceKeyValue.textContent = deviceKeyValue.dataset.key || '';
        toggleDeviceKeyBtn.textContent = '隐藏';
      } else {
        deviceKeyValue.textContent = MASKED_KEY;
        toggleDeviceKeyBtn.textContent = '显示';
      }
    });
  }

  // Copy device key button
  const copyDeviceKeyBtn = document.getElementById('copy-device-key');
  if (copyDeviceKeyBtn && deviceKeyValue) {
    copyDeviceKeyBtn.addEventListener('click', async () => {
      const key = deviceKeyValue.dataset.key || '';
      if (!key) return;
      try {
        await navigator.clipboard.writeText(key);
        copyDeviceKeyBtn.textContent = '已复制';
        setTimeout(() => {
          copyDeviceKeyBtn.textContent = '复制';
        }, 1500);
      } catch (err) {
        copyDeviceKeyBtn.textContent = '复制失败';
      }
    });
  }

  // 页面加载时：优先使用 localStorage 中保存的 device_key，否则自动生成
  const storedKey = getDeviceKey();
  const currentDeviceKey = renderDeviceKey(storedKey);
  if (currentDeviceKey) {
    addDevice(currentDeviceKey, '本机');
  }

  // One-time report status area
  const reportStatusEl = document.getElementById('report-status');

  async function reportOnce(deviceKey, deviceName) {
    const key = deviceKey || getDeviceKey();
    const name = deviceName || (document.getElementById('monitor-device-name') && document.getElementById('monitor-device-name').value.trim()) || key.slice(0, 8);

    if (reportStatusEl) {
      reportStatusEl.textContent = '正在检测并上报...';
      reportStatusEl.className = 'empty';
    }

    try {
      const myipResponse = await fetch('/api/myip');
      if (!myipResponse.ok) {
        throw new Error(`检测失败 ${myipResponse.status}`);
      }
      const myip = await myipResponse.json();

      const payload = {
        device_key: key,
        device_name: name,
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

      if (reportStatusEl) {
        reportStatusEl.innerHTML = `已上报：${escapeHtml(myip.ip)} (${escapeHtml(myip.version)})，现在可以用 device_key 查询本机 IP。`;
        reportStatusEl.className = 'empty';
      }
      return { ok: true, ip: myip.ip, version: myip.version };
    } catch (err) {
      if (reportStatusEl) {
        reportStatusEl.innerHTML = `<span class="error">上报失败：${escapeHtml(err.message)}</span>`;
      }
      return { ok: false, error: err.message };
    }
  }

  // Report once button
  const reportOnceBtn = document.getElementById('report-once');
  if (reportOnceBtn) {
    reportOnceBtn.addEventListener('click', () => {
      reportOnce(currentDeviceKey);
    });
  }

  // Auto-report once on first page load so the device is immediately queryable
  if (currentDeviceKey) {
    reportOnce(currentDeviceKey);
  }

  // Check my public IP
  function bindCheckMyIp(buttonId, resultId, contentId, autoTrigger) {
    const checkMyIpBtn = document.getElementById(buttonId);
    const myipResult = document.getElementById(resultId);
    const myipResultContent = document.getElementById(contentId);

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
              <dt>公网 IP</dt><dd>${escapeHtml(data.ip)} ${copyButtonHtml(data.ip)}</dd>
              <dt>协议版本</dt><dd>${escapeHtml(data.version)}</dd>
            </dl>
            <p class="empty" style="margin-top:0.75rem">如果你看到的是 IPv6，说明当前网络支持 IPv6。</p>
          `;
        } catch (err) {
          myipResultContent.innerHTML = `<p class="error">检测出错：${escapeHtml(err.message)}</p>`;
        }
      });

      if (autoTrigger) {
        checkMyIpBtn.click();
      }
    }
  }

  bindCheckMyIp('check-my-ip', 'myip-result', 'myip-result-content');
  bindCheckMyIp('hero-check-my-ip', 'hero-myip-result', 'hero-myip-result-content', true);

  // Browser-side IP monitor
  const monitorForm = document.getElementById('monitor-form');
  const monitorToggle = document.getElementById('monitor-toggle');
  const monitorResult = document.getElementById('monitor-result');
  const monitorResultContent = document.getElementById('monitor-result-content');
  const monitorDot = document.getElementById('monitor-dot');

  let monitorTimer = null;
  let isMonitoring = false;
  const MONITOR_INTERVAL_MS = 120 * 1000;

  if (monitorForm && monitorToggle && monitorResult && monitorResultContent) {
    monitorForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (isMonitoring) {
        stopMonitor();
        return;
      }

      const deviceKeyInput = monitorForm.querySelector('[name="device_key"]');
      const deviceNameInput = monitorForm.querySelector('[name="device_name"]');

      let deviceKey = deviceKeyInput.value.trim();

      if (!deviceKey) {
        deviceKey = generateUuid();
        deviceKeyInput.value = deviceKey;
        renderDeviceKey(deviceKey);
      }

      const deviceName = deviceNameInput.value.trim();
      monitorResult.classList.remove('hidden');
      startMonitor(deviceKey, deviceName);
    });
  }

  function startMonitor(deviceKey, deviceName) {
    isMonitoring = true;
    monitorToggle.textContent = '关闭监听';
    monitorToggle.classList.remove('btn-primary');
    monitorToggle.classList.add('btn-secondary');
    regenerateKeyBtn.disabled = true;
    if (monitorDot) {
      monitorDot.classList.add('active');
      monitorDot.setAttribute('title', '正在监听本机 IP');
    }

    const inputs = monitorForm.querySelectorAll('input');
    inputs.forEach((input) => {
      input.dataset.wasDisabled = input.disabled;
      input.disabled = true;
    });

    reportCurrentIp(deviceKey, deviceName);
    monitorTimer = setInterval(() => {
      reportCurrentIp(deviceKey, deviceName);
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
    regenerateKeyBtn.disabled = false;
    if (monitorDot) {
      monitorDot.classList.remove('active');
      monitorDot.removeAttribute('title');
    }

    const inputs = monitorForm.querySelectorAll('input');
    inputs.forEach((input) => {
      input.disabled = input.dataset.wasDisabled === 'true';
    });

    monitorResultContent.innerHTML += `
      <p class="empty" style="margin-top:0.75rem">监听已停止。</p>
    `;
  }

  async function reportCurrentIp(deviceKey, deviceName) {
    const statusEl = document.createElement('p');
    statusEl.className = 'empty';
    statusEl.textContent = `正在检测并上报... ${new Date().toLocaleTimeString('zh-CN')}`;
    monitorResultContent.appendChild(statusEl);

    try {
      const myipResponse = await fetch('/api/myip');
      if (!myipResponse.ok) {
        throw new Error(`检测失败 ${myipResponse.status}`);
      }
      const myip = await myipResponse.json();

      const payload = {
        device_key: deviceKey,
        device_name: deviceName || deviceKey.slice(0, 8),
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

      statusEl.remove();
      monitorResultContent.innerHTML = `
        <dl>
          <dt>状态</dt><dd>已上报</dd>
          <dt>当前 IP</dt><dd>${escapeHtml(myip.ip)} (${escapeHtml(myip.version)}) ${copyButtonHtml(myip.ip)}</dd>
          <dt>时间</dt><dd>${new Date().toLocaleString('zh-CN')}</dd>
        </dl>
      `;
    } catch (err) {
      statusEl.remove();
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

  function copyButtonHtml(text, label) {
    return `<button type="button" class="copy-btn-inline" data-copy="${escapeHtml(text)}" aria-label="复制">${label || '复制'}</button>`;
  }

  function getDeviceStatus(updatedAt) {
    if (!updatedAt) return { label: '未知', className: 'status-unknown' };
    const diff = Date.now() - new Date(updatedAt).getTime();
    if (diff < 2 * 60 * 1000) return { label: '在线', className: 'status-online' };
    if (diff < 10 * 60 * 1000) return { label: '最近在线', className: 'status-recent' };
    return { label: '离线', className: 'status-offline' };
  }

  function statusBadgeHtml(status) {
    return `<span class="status-badge ${escapeHtml(status.className)}">${escapeHtml(status.label)}</span>`;
  }

  // Delegated copy buttons for inline values
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.copy-btn-inline');
    if (!button) return;

    const text = button.dataset.copy || '';
    try {
      await navigator.clipboard.writeText(text);
      button.classList.add('copied');
      const original = button.textContent;
      button.textContent = '已复制';
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('copied');
      }, 1500);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        button.classList.add('copied');
        const original = button.textContent;
        button.textContent = '已复制';
        setTimeout(() => {
          button.textContent = original;
          button.classList.remove('copied');
        }, 1500);
      } catch (e) {
        button.textContent = '复制失败';
      }
      document.body.removeChild(textarea);
    }
  });

  // Delegated save-to-devices button
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.save-device');
    if (!button) return;

    const key = button.dataset.key || '';
    const name = button.dataset.name || key.slice(0, 8);
    if (!key) return;

    const storage = window.ipstunStorage;
    if (!storage) return;

    const added = storage.addDevice(key, name);
    button.textContent = added ? '已保存' : '已存在';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = '保存到我的设备';
      button.disabled = false;
    }, 1500);
  });
})();
