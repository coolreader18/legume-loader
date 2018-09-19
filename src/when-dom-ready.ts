const loadedStates = ["interactive", "complete"];
const whenDOMReady = () =>
  new Promise(function(resolve) {
    if (loadedStates.indexOf(document.readyState) !== -1) {
      resolve();
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        resolve();
      });
    }
  });

export default whenDOMReady;
