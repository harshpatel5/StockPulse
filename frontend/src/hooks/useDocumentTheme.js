import { useLayoutEffect } from 'react';

// Marks the document with the active theme so portaled content (modals) and the
// body background read the same tokens as the page that opened them.
export const useDocumentTheme = (theme) => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = theme;

    return () => {
      if (previous === undefined) {
        delete root.dataset.theme;
      } else {
        root.dataset.theme = previous;
      }
    };
  }, [theme]);
};
