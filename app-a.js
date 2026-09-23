
  (function(){
    var _bank = {version:1, entries:[]};
    try {
      var el = document.getElementById('bank-data');
      if (el && el.textContent) {
        _bank = JSON.parse(el.textContent);
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'texts.json', false);
        xhr.send(null);
        if (xhr.status >= 200 && xhr.status < 300) _bank = JSON.parse(xhr.responseText);
      }
    } catch (e) {}
    window.__HOT_BANK__ = _bank;
  })();
