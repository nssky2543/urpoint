export const THEME_BOOT_SCRIPT = `(function(){
  var cookieName = 'urpoint-theme';
  function read(){
    var parts = document.cookie.split(';');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part.indexOf(cookieName + '=') === 0) {
        var value = decodeURIComponent(part.slice(cookieName.length + 1));
        return value === 'dark' ? 'dark' : 'light';
      }
    }
    return 'light';
  }
  function apply(next){
    document.documentElement.setAttribute('data-theme', next);
    var nodes = document.querySelectorAll('[data-theme]');
    for (var i = 0; i < nodes.length; i++) nodes[i].setAttribute('data-theme', next);
    document.cookie = cookieName + '=' + next + '; Path=/; Max-Age=31536000; SameSite=Lax';
  }
  function closestToggle(node){
    while (node && node !== document) {
      if (node.getAttribute && node.getAttribute('data-theme-toggle') !== null) return node;
      node = node.parentNode;
    }
    return null;
  }
  apply(read());
  document.addEventListener('click', function(event){
    if (!closestToggle(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }, true);
})();`
