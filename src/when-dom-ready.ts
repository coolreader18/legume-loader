const loadedStates = ["interactive", "complete"];
const whenDOMReady = (doc: Document) =>
  new Promise(function(resolve) {
    if (loadedStates.indexOf(doc.readyState) !== -1) {
      resolve();
    } else {
      doc.addEventListener("DOMContentLoaded", () => {
        resolve();
      });
    }
  });

export default whenDOMReady;
