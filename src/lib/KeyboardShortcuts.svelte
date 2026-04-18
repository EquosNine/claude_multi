<script lang="ts">
  import { panelStore } from './stores/panels.svelte';
  import { copyPanelOutput } from './export';

  function handleKeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;

    // Ctrl+1 through Ctrl+6
    if (e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      const panel = panelStore.getPanelByIndex(index);
      if (panel) {
        panelStore.setFocusedPanel(panel.id);
        const textarea = document.querySelector(
          `[data-panel-id="${panel.id}"] textarea`
        ) as HTMLTextAreaElement | null;
        textarea?.focus();
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'n':
        if (!e.shiftKey) {
          e.preventDefault();
          panelStore.createPanel();
        }
        break;
      case 'l':
        if (!e.shiftKey) {
          e.preventDefault();
          const panel = panelStore.getFocusedPanel();
          if (panel) panelStore.clearMessages(panel.id);
        }
        break;
      case 'w':
        if (!e.shiftKey) {
          e.preventDefault();
          const panel = panelStore.getFocusedPanel();
          if (panel && panelStore.panels.length > 1) {
            panelStore.removePanel(panel.id);
          }
        }
        break;
      case 'c':
        if (e.shiftKey) {
          e.preventDefault();
          const panel = panelStore.getFocusedPanel();
          if (panel) copyPanelOutput(panel.messages);
        }
        break;
      case 'g':
        if (!e.shiftKey) {
          e.preventDefault();
          panelStore.toggleLayout();
        }
        break;
    }
  }

  $effect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>
