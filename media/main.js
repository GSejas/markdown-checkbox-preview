(function () {
  // Acquire the VS Code API
  const vscode = acquireVsCodeApi();

  // Handle messages from the extension
  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
      case 'rerender':
        const rootElement = document.getElementById('root');
        if (rootElement && message.html) {
          rootElement.innerHTML = message.html;
        }
        break;
      case 'updateProgress':
        updateProgressBar(message.completed, message.total);
        break;
      case 'scroll':
        scrollToLine(message.line);
        break;
    }
  });

  // Synchronized scrolling: scroll preview to match editor line
  function scrollToLine(line) {
    // Find the element closest to the target line
    const elements = document.querySelectorAll('[data-source-line], [data-line]');
    let targetElement = null;
    let closestDistance = Infinity;

    for (const element of elements) {
      const elementLine = parseInt(element.dataset.sourceLine || element.dataset.line, 10);
      if (!isNaN(elementLine)) {
        const distance = Math.abs(elementLine - line);
        if (distance < closestDistance) {
          closestDistance = distance;
          targetElement = element;
        }
        // If we found an exact match, use it
        if (elementLine === line) {
          break;
        }
      }
    }

    if (targetElement) {
      // Smooth scroll to the element
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // Handle checkbox clicks and header clicks
  document.body.addEventListener('click', event => {
    const target = event.target;
    
    // Handle checkbox clicks
    if (target.tagName === 'INPUT' && target.classList.contains('md-checkbox')) {
      const lineNumber = parseInt(target.dataset.line, 10);
      if (!isNaN(lineNumber)) {
        // Send toggle message to extension
        vscode.postMessage({
          type: 'toggle',
          line: lineNumber
        });
        
        // Disable the checkbox temporarily to prevent rapid clicking
        target.disabled = true;
        setTimeout(() => {
          target.disabled = false;
        }, 100);
      }
    }
    
    // Handle header clicks
    if ((target.tagName === 'H1' || target.tagName === 'H2' || target.tagName === 'H3' || 
         target.tagName === 'H4' || target.tagName === 'H5' || target.tagName === 'H6') && 
        target.classList.contains('clickable-header')) {
      const lineNumber = parseInt(target.dataset.line, 10);
      if (!isNaN(lineNumber)) {
        // Send navigate message to extension
        vscode.postMessage({
          type: 'navigate',
          line: lineNumber
        });
      }
    }
  });

  // Update progress bar
  function updateProgressBar(completed, total) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar && progressText) {
      const percentage = total > 0 ? (completed / total) * 100 : 0;
      progressBar.style.width = percentage + '%';
      progressText.textContent = `${completed}/${total} tasks completed (${Math.round(percentage)}%)`;
    }
  }

  // Initialize progress on load
  document.addEventListener('DOMContentLoaded', () => {
    // Count initial checkboxes
    const checkboxes = document.querySelectorAll('.md-checkbox');
    const checked = document.querySelectorAll('.md-checkbox:checked');
    updateProgressBar(checked.length, checkboxes.length);
  });

  // Add keyboard navigation support
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      const target = event.target;
      if (target.tagName === 'INPUT' && target.classList.contains('md-checkbox')) {
        event.preventDefault();
        target.click();
      }
    }
  });
})();
