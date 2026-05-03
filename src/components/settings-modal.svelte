<script lang="ts">
  import { settings, updateSetting, resetSettings, fontFamilyEntries, uiScaleEntries, type FontFamilyKey, type UIScaleKey } from "../stores/settings";
  import { themeEntries, type ThemeKey } from "../stores/theme";
  
  export let isOpen = false;
  export let onClose: () => void;
  
  let activeSection: "appearance" | "accessibility" = "appearance";
  
  const handleThemeChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    updateSetting("theme", target.value as ThemeKey);
  };
  
  const handleFontChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    updateSetting("fontFamily", target.value as FontFamilyKey);
  };
  
  const handleScaleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    updateSetting("uiScale", target.value as UIScaleKey);
  };
  
  // The UI toggle is labelled "コンパクト表示" (compact mode), which is the
  // inverse of the underlying showHelpText flag. Toggle ON = compact = hide help.
  const handleHelpTextToggle = (event: Event) => {
    const target = event.target as HTMLInputElement;
    updateSetting("showHelpText", !target.checked);
  };
  
  const handleReset = () => {
    if (confirm("すべての設定をデフォルトに戻しますか？")) {
      resetSettings();
    }
  };
  
  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };
  
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  };
</script>

{#if isOpen}
  <div 
    class="settings-backdrop" 
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div class="settings-modal" role="dialog" aria-labelledby="settings-title" aria-modal="true">
      <div class="settings-header">
        <h2 id="settings-title">設定</h2>
        <button 
          class="close-button" 
          on:click={onClose}
          aria-label="設定を閉じる"
          type="button"
        >
          ✕
        </button>
      </div>
      
      <div class="settings-tabs">
        <button
          class="tab-button"
          class:active={activeSection === "appearance"}
          on:click={() => activeSection = "appearance"}
          type="button"
        >
          外観
        </button>
        <button
          class="tab-button"
          class:active={activeSection === "accessibility"}
          on:click={() => activeSection = "accessibility"}
          type="button"
        >
          アクセシビリティ
        </button>
      </div>
      
      <div class="settings-content">
        {#if activeSection === "appearance"}
          <section class="settings-section" aria-labelledby="appearance-heading">
            <h3 id="appearance-heading">外観</h3>
            
            <div class="setting-item">
              <label for="theme-select">
                <span class="setting-label">テーマ</span>
                <span class="setting-description">カラースキームを選択</span>
              </label>
              <span class="select-wrapper">
                <select
                  id="theme-select"
                  value={$settings.theme}
                  on:change={handleThemeChange}
                >
                  {#each themeEntries as [key, label]}
                    <option value={key}>{label}</option>
                  {/each}
                </select>
              </span>
            </div>

            <div class="setting-item">
              <label for="font-select">
                <span class="setting-label">フォント</span>
                <span class="setting-description">テキストの表示を調整</span>
              </label>
              <span class="select-wrapper">
                <select
                  id="font-select"
                  value={$settings.fontFamily}
                  on:change={handleFontChange}
                >
                  {#each fontFamilyEntries as [key, label]}
                    <option value={key}>{label}</option>
                  {/each}
                </select>
              </span>
            </div>

            <div class="setting-item">
              <label for="scale-select">
                <span class="setting-label">UIサイズ</span>
                <span class="setting-description">インターフェースの拡大率を調整</span>
              </label>
              <span class="select-wrapper">
                <select
                  id="scale-select"
                  value={$settings.uiScale}
                  on:change={handleScaleChange}
                >
                  {#each uiScaleEntries as [key, value]}
                    <option value={key}>{value.label}</option>
                  {/each}
                </select>
              </span>
            </div>
          </section>
        {/if}
        
        {#if activeSection === "accessibility"}
          <section class="settings-section" aria-labelledby="accessibility-heading">
            <h3 id="accessibility-heading">アクセシビリティ</h3>
            
            <div class="setting-item">
              <label for="help-text-toggle" class="toggle-label">
                <div>
                  <span class="setting-label">コンパクト表示</span>
                  <span class="setting-description">ONにすると、計算機ページの紹介文・ヒント・補足説明を隠して操作に必要な要素だけを表示します</span>
                </div>
                <input
                  id="help-text-toggle"
                  type="checkbox"
                  class="toggle-input"
                  checked={!$settings.showHelpText}
                  on:change={handleHelpTextToggle}
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </section>
        {/if}
      </div>
      
      <div class="settings-footer">
        <button 
          class="reset-button"
          on:click={handleReset}
          type="button"
        >
          デフォルトに戻す
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: var(--spacing-md);
    animation: fadeIn 0.2s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .settings-modal {
    background: var(--surface);
    border-radius: var(--border-radius);
    box-shadow: 0 8px 32px var(--shadow);
    border: 1px solid var(--border-strong);
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
  }
  
  .settings-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary);
  }
  
  .close-button {
    background: transparent;
    border: 1px solid transparent;
    font-size: 1.25rem;
    color: var(--text-secondary);
    cursor: pointer;
    width: 40px;
    height: 40px;
    line-height: 1;
    border-radius: var(--radius-lg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background var(--transition), color var(--transition),
      border-color var(--transition), box-shadow var(--transition);
  }

  .close-button:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
    border-color: var(--border-soft);
  }

  .close-button:focus-visible {
    outline: none;
    box-shadow: var(--ring-shadow);
  }
  
  .settings-tabs {
    display: flex;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-lg) 0;
    border-bottom: 1px solid var(--border-color);
  }
  
  .tab-button {
    background: transparent;
    border: none;
    padding: 12px 18px;
    min-height: 44px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    transition: color var(--transition), background var(--transition),
      border-color var(--transition);
  }

  .tab-button:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }

  .tab-button:focus-visible {
    outline: none;
    box-shadow: var(--ring-shadow);
  }

  .tab-button.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
    font-weight: 600;
  }
  
  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
  }
  
  .settings-section h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }
  
  .setting-item {
    margin-bottom: var(--spacing-lg);
  }
  
  .setting-item:last-child { margin-bottom: 0; }
  
  .setting-item label {
    display: block;
    margin-bottom: var(--spacing-xs);
  }
  
  .setting-label {
    display: block;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }
  
  .setting-description {
    display: block;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  
  .setting-item select {
    width: 100%;
    padding: 12px 44px 12px 16px;
    min-height: 44px;
    background: var(--surface-raised);
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: border-color var(--transition), box-shadow var(--transition),
      background var(--transition);
  }

  .setting-item select::-ms-expand {
    display: none;
  }

  .setting-item select:hover {
    border-color: var(--primary-light);
    background: var(--surface);
  }

  .setting-item select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: var(--ring-shadow);
  }
  
  .toggle-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    border-radius: calc(var(--border-radius) / 2);
    transition: background var(--transition);
  }
  
  .toggle-label:hover { background: var(--surface-hover); }
  .toggle-label > div { flex: 1; }
  
  /* visually hidden but focusable so :focus-visible still applies */
  .toggle-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: relative;
    display: inline-block;
    width: 56px;
    height: 30px;
    background: var(--border-color);
    border-radius: var(--radius-full);
    transition: background var(--transition), box-shadow var(--transition);
    flex-shrink: 0;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .toggle-slider::before {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    transition: transform var(--transition);
    box-shadow: var(--shadow-md);
  }

  .toggle-input:checked + .toggle-slider { background: var(--primary-color); }
  .toggle-input:checked + .toggle-slider::before { transform: translateX(26px); }
  .toggle-input:focus-visible + .toggle-slider {
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08), var(--ring-shadow);
  }
  
  .settings-footer {
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
  }
  
  .reset-button {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    color: var(--text-secondary);
    padding: 10px 20px;
    min-height: 44px;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    box-shadow: var(--shadow-sm);
    transition: background var(--transition), border-color var(--transition),
      color var(--transition), box-shadow var(--transition), transform var(--transition);
  }

  .reset-button:hover {
    background: var(--surface-hover);
    border-color: var(--primary-color);
    color: var(--text-primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .reset-button:active {
    transform: translateY(0);
    box-shadow: var(--shadow-sm);
  }

  .reset-button:focus-visible {
    outline: none;
    box-shadow: var(--shadow-md), var(--ring-shadow);
  }
  
  @media (max-width: 768px) {
    .settings-modal {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }
    .settings-tabs { overflow-x: auto; }
  }
</style>
