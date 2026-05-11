(function() {
  const script = document.currentScript;
  const token = script.getAttribute('data-token');
  const baseUrl = script.src.replace('/widget.js', '');

  const container = document.createElement('div');
  container.id = 'twg-chat-widget-container';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '999999',
    width: '80px',
    height: '80px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    overflow: 'hidden'
  });

  const iframe = document.createElement('iframe');
  iframe.src = `${baseUrl}?widget=true&token=${token}`;
  
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    colorScheme: 'dark'
  });

  container.appendChild(iframe);
  document.body.appendChild(container);

  window.addEventListener('message', (event) => {
    if (event.data.type === 'twg-toggle') {
      if (event.data.isOpen) {
        container.style.width = '420px';
        container.style.height = '700px';
      } else {
        container.style.width = '80px';
        container.style.height = '80px';
      }
    }
  });
})();
