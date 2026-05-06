<script>
  import { onMount, tick } from 'svelte';
  import Cropper from "svelte-easy-crop";
  import logo from '/pwlogo.png'
  import { getCroppedImg } from './lib/CanvasUtils.js';


  let borders = [ 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Jota', 'Lambda', 'Omega' ]
  let deres = [ 'Bodere', 'Dandere', 'Deredere', 'Kamidere', 'Kuudere', 'Mayadere', 'Tsundere', 'Yandere', 'Raito', 'Yami', 'Yato' ]
  let variantsMap = {};
  
  let editMode = false;

  let pixelCrop = { x: 0, y: 0, width: 475, height: 667 };
  let extraPixelCrop = { x: 0, y: 0, width: 475, height: 667 };
  let crop = { x: 0, y: 0 };
  let extraCrop = { x: 0, y: 0 };
  let curzoom = 1;
  let extraZoom = 1;
  let isUpscaling = false;
  let isExtraUpscaling = false;

  let extraImage = null;
  let activeLayer = 'base';

  let bgModel = 'small';
  let bgRemoving = false;
  let bgProgress = 0;
  let bgProgressLabel = '';
  let bgAutoLayer = false;

  
  async function syncLayers() {
    if (activeLayer === 'extra' || activeLayer === 'both') {
      // top jest dowodzący -> kopiuj top na scalp
      crop = { x: extraCrop.x, y: extraCrop.y };
      curzoom = extraZoom;
      await tick();
      curzoom = curzoom + 0.000001;
      await tick();
      curzoom = curzoom - 0.000001;
    } else {
      // scalp jest dowodzący -> kopiuj scalp na top
      extraCrop = { x: crop.x, y: crop.y };
      extraZoom = curzoom;
      await tick();
      extraZoom = extraZoom + 0.000001;
      await tick();
      extraZoom = extraZoom - 0.000001;
    }
  }

  async function moveCrop(dx, dy) {
    if (activeLayer === 'base' || activeLayer === 'both') {
      crop.x = Math.round(crop.x) + dx;
      crop.y = Math.round(crop.y) + dy;
      // Wymuś emisję cropcomplete przez mikrozmianę zoom
      await tick();
      curzoom = curzoom + 0.000001;
      await tick();
      curzoom = curzoom - 0.000001;
    }
    if (activeLayer === 'extra' || activeLayer === 'both') {
      extraCrop.x = Math.round(extraCrop.x) + dx;
      extraCrop.y = Math.round(extraCrop.y) + dy;
      await tick();
      extraZoom = extraZoom + 0.000001;
      await tick();
      extraZoom = extraZoom - 0.000001;
    }
  }

  const maskCropSize = { width: 475, height: 667 };

  $: currentMaskUrl = `/masks/${selectedBorder}.png`;
  $: extraMaskUrl = `/masks/${selectedBorder}_top.png`;
  $: hasExtraLayer = ['Delta', 'Eta', 'Omega'].includes(selectedBorder);
  $: if (!hasExtraLayer)  {
    activeLayer = 'base';
  }
  
  let dpr = (typeof window !== 'undefined') ? window.devicePixelRatio : 1;
  let zoomLevel = (typeof window !== 'undefined' && window.innerWidth < 900) ? 2 : 1;

  $: finalScale = (1 / dpr) * zoomLevel;

  onMount(() => {
    calculateScaling();

    window.addEventListener('resize', calculateScaling);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', calculateScaling);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  function calculateScaling() {
    dpr = window.devicePixelRatio || 1;
  }

  async function fetchVariants() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Extensions/CardExtension.cs');
      const text = await response.text();
      const startIndex = text.indexOf('public static int GetCardVariantsCount(this Card card)');
      if (startIndex !== -1) {
        const functionText = text.substring(startIndex);
        const endIndex = functionText.indexOf('}');
        if (endIndex !== -1) {
          const functionBody = functionText.substring(0, endIndex + 1);
          const lines = functionBody.split(/\r?\n/);
          for (const line of lines) {
            const match = line.match(/Quality\.(\w+)\s*=>\s*(\d+)/);
            if (match) {
              variantsMap = { ...variantsMap, [match[1]]: parseInt(match[2]) };
            }
          }
        }
      }
      initDefaults();
    } catch (error) {
      console.error('Error fetching variants:', error);
    }
  }

  onMount(fetchVariants);

  function getVariantsCount(border) {
    return variantsMap[border] || 0;
  }

  function getStyleList() {
    switch (selectedBorder) {
      case 'Delta':
      case 'Eta':
      case 'Lambda':
        return Array.from({length: getVariantsCount(selectedBorder) + 1}, (_, i) => i.toString());
      default:
        return null;
    }
  }

  let image = "https://sanakan.pl/i/ss/sUwh3io.png";
  let isLocalFile = false;
  let showStats = false;
  let dragOver = false;

  let selectedBorder = 'Delta';
  let selectedDere = 'Mayadere';
  let selectedStyle = '2'
  $: styles = Object.keys(variantsMap).length ? getStyleList() : [];
  
  let wrapperRef;
  let fileinput;
  let extraFileinput;
  let dragOverExtra = false;

  function previewCrop(e) {
    pixelCrop = e.detail.pixels;
    isUpscaling = pixelCrop.width < 475 || pixelCrop.height < 667;
  }

  function previewExtraCrop(e) {
    extraPixelCrop = e.detail.pixels;
    isExtraUpscaling = extraPixelCrop.width < 475 || extraPixelCrop.height < 667;
  }

  function processFile(imageFile) {
    if (!imageFile.type.startsWith('image/')) {
      alert('Proszę przeciągnąć plik obrazu JPG lub PNG.');
      return;
    }
    let reader = new FileReader();
    reader.onload = e => {
      image = e.target.result;
      curzoom = 1;
    };
    reader.readAsDataURL(imageFile);
  }
  
  function processExtraFile(file) {
    if (!file) return;
    let reader = new FileReader();
    reader.onload = e => {
      extraImage = e.target.result;
      activeLayer = 'extra';
      bgAutoLayer = false;
      extraZoom = 1;
    };
    reader.readAsDataURL(file);
  }

  function initDefaults() {
    selectedBorder = 'Delta';
    selectedDere = 'Mayadere';
    selectedStyle = '2';
    showStats = false;
    image = "https://sanakan.pl/i/ss/sUwh3io.png";
  }

  function onFileSelected(e) {
    isLocalFile = true;
    processFile(e.target.files[0]);
  }

  function onDragOver(e) {
    e.preventDefault();
    dragOver = true;
  }

  function onDragLeave() {
    dragOver = false;
  }

  function onDrop(e) {
    e.preventDefault();
    dragOver = false;
    const imageFile = e.dataTransfer.files[0];
    if (!imageFile) return;
    const dt = new DataTransfer();
    dt.items.add(imageFile);
    fileinput.files = dt.files;
    isLocalFile = true;
    processFile(imageFile);
  }

  function onExtraDragOver(e) {
    e.preventDefault();
    dragOverExtra = true;
  }

  function onExtraDragLeave() {
    dragOverExtra = false;
  }

  function onExtraDrop(e) {
    e.preventDefault();
    dragOverExtra = false;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    extraFileinput.files = dt.files;
    processExtraFile(file);
  }

  function getStyle() {
    let variantsCount = getVariantsCount(selectedBorder);
    if (variantsCount === 0) return "";
	
    let selectedStyleInt = parseInt(selectedStyle);
    if (selectedStyleInt > variantsCount || selectedStyleInt <= 0)
	{
      selectedStyle = '0';
      return "";
    }
    return selectedStyle;
  }

  function getBorder() {
    let styleUri = getStyle();
    switch (selectedBorder) {
      case 'Beta':
      case 'Epsilon':
      case 'Gamma':
      case 'Theta':
        return "";
      case 'Omega':
        return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/Border${styleUri}.webp`;
      default:
        return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/Border${styleUri}.png`;
    }
  }

  function getBackBorder() {
    let styleUri = getStyle();
    switch (selectedBorder) {
      case 'Jota':
          return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/Border/${selectedDere}.png`;
      case 'Delta':
      case 'Eta':
      case 'Lambda':
        return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/BorderBack${styleUri}.png`;
      case 'Omega':
        return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/BorderBack${styleUri}.webp`;
      default:
        return "";
    }
  }

  function getDere() {
    switch (selectedBorder) {
      case 'Beta':
      case 'Epsilon':
      case 'Gamma':
      case 'Theta':
        return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/Border/${selectedDere}.png`
      default:
        return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/Dere/${selectedDere}.png`;
    }
  }

  function getStats() {
    let styleUri = getStyle();
    switch (selectedBorder) {
      case 'Lambda':
      case 'Zeta':
        return "";
      case 'Gamma':
      case 'Jota':
      case 'Theta':
        return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/Stats/${selectedDere}.png`;
      case 'Beta':
      case 'Epsilon':
        if (selectedDere === 'Yami' || selectedDere === 'Raito' || selectedDere === 'Yato')
          return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/Stats/${selectedDere}.png`
      default:
        return `https://raw.githubusercontent.com/MZKNEK/sanakan/master/src/Pictures/PW/CG/${selectedBorder}/Stats${styleUri}.png`;
    }
  }

  let borderUri = "";
  let backBorderUri = "";
  let statsUri = "";
  let dereUri = "";

  function updateData() {
    styles = getStyleList();
    borderUri = getBorder();
    backBorderUri = getBackBorder();
    statsUri = getStats();
    dereUri = getDere();
  }

  $: if (selectedBorder || selectedDere || selectedStyle || Object.keys(variantsMap).length) updateData();

  function handleKeyDown(e) {
    if (!editMode) return;
    
    const step = e.shiftKey ? 10 : 1;

    if (e.key === 'ArrowLeft')  moveCrop(-step, 0);
    if (e.key === 'ArrowRight') moveCrop(step, 0);
    if (e.key === 'ArrowUp')    moveCrop(0, -step);
    if (e.key === 'ArrowDown')  moveCrop(0, step);
  }

  async function resetZoom() {
    if (activeLayer === 'base' || activeLayer === 'both') {
      curzoom = 1;
      crop = { x: 0, y: 0 };
      await tick();
      curzoom = 1.000001;
      await tick();
      curzoom = 1;
    }
    if (activeLayer === 'extra' || activeLayer === 'both') {
      extraZoom = 1;
      extraCrop = { x: 0, y: 0 };
      await tick();
      extraZoom = 1.000001;
      await tick();
      extraZoom = 1;
    }
  }

  async function removeBg() {
    if (!image || bgRemoving) return;
    bgRemoving = true;
    bgProgress = 0;
    bgProgressLabel = 'Inicjalizacja...';
    try {
      const imglyModule = await import('@imgly/background-removal');
      const removeBackground = imglyModule.default ?? imglyModule.removeBackground ?? imglyModule;
      const blob = await removeBackground(image, {
        model: bgModel,
        progress: (key, current, total) => {
          if (total > 0) {
            bgProgress = Math.round((current / total) * 100);
            bgProgressLabel = key.includes('fetch') ? 'Pobieranie modelu...' : 'Przetwarzanie...';
          }
        }
      });
      const url = URL.createObjectURL(blob);
      extraImage = url;
      activeLayer = 'both';
      bgAutoLayer = true;
      bgProgressLabel = 'Gotowe!';
    } catch (e) {
      console.error('removeBg error:', e);
      bgProgressLabel = 'Błąd: ' + (e?.message || 'sprawdź konsolę');
      bgRemoving = false;
      bgProgress = 0;
    } finally {
      if (bgRemoving) {
        bgRemoving = false;
        bgProgress = 0;
      }
    }
  }

  async function downloadImage() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 475;
      canvas.height = 667;
      const ctx = canvas.getContext('2d');

      // Kolejność warstw: gdy bgAutoLayer (removeBg), scalp jest nad top
      // Normalnie: top jest nad scalp
      let mainImagePart;
      if (editMode) {
        mainImagePart = await getCroppedImg(image, pixelCrop, currentMaskUrl);
      } else {
        mainImagePart = image;
      }
      const imgMain = await loadImg(mainImagePart);

      if (hasExtraLayer && extraImage) {
        const croppedExtra = await getCroppedImg(extraImage, extraPixelCrop, extraMaskUrl);
        const imgExtra = await loadImg(croppedExtra);
        if (bgAutoLayer) {
          // removeBg: najpierw top (wycięta postać), potem scalp (oryginał z maską) na wierzchu
          ctx.drawImage(imgExtra, 0, 0);
          ctx.drawImage(imgMain, 0, 0);
        } else {
          // normalnie: scalp, potem top
          ctx.drawImage(imgMain, 0, 0);
          ctx.drawImage(imgExtra, 0, 0);
        }
      } else {
        ctx.drawImage(imgMain, 0, 0);
      }

      // Finalizacja pobierania
      const finalUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = `composition-${selectedBorder}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Błąd pobierania:', error);
    }
  }
  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => {
        console.error("Błąd ładowania obrazu: " + src, err);
        reject(err);
      };
      img.src = src;
    });
  }

</script>
<main>

  <div class="app-layout">
    
    <div class="left-panel">
      <div class="logo-container">
        <a href="https://sanakan.pl" target="_blank" rel="noreferrer">
          <img src={logo} class="logo" alt="Logo" />
        </a>
      </div>

      <div class="selector">
        <label><div class="stext">Ramka:</div> 
          <select bind:value={selectedBorder}>
            {#each borders as value}<option {value}>{value}</option>{/each}
          </select>
        </label>

        <label><div class="stext">Dere:</div> 
          <select class="nselect" bind:value={selectedDere}>
            {#each deres as value}<option {value}>{value}</option>{/each}
          </select>
        </label>

        {#if styles}
          <label><div class="stext">Styl:</div> 
            <select class="nselect" bind:value={selectedStyle}>
              {#each styles as value}<option {value}>{value}</option>{/each}
            </select>
          </label>
        {/if}
      </div>

      <div class="form-container">
        <div class="link-row">
          <div class="ltext">Lokalny plik:</div>
          <div class="dropzone {dragOver ? 'drag-over' : ''}"
            on:dragover={onDragOver} on:dragleave={onDragLeave} on:drop={onDrop}>
            <input type="file" class="file-input" accept=".jpg, .jpeg, .png, .webp" 
              on:change={onFileSelected} bind:this={fileinput} />
          </div>
        </div>
        {#if editMode && hasExtraLayer}
        <div class="link-row">
          <div class="ltext">Warstwa top:</div>
          <div class="dropzone {dragOverExtra ? 'drag-over' : ''}"
            on:dragover={onExtraDragOver} on:dragleave={onExtraDragLeave} on:drop={onExtraDrop}>
            <input type="file" class="file-input" accept=".jpg, .jpeg, .png, .webp"
              on:change={(e) => processExtraFile(e.target.files[0])} bind:this={extraFileinput} />
          </div>
        </div>
        {/if}
        {#if !isLocalFile}
        <div class="link-row">
          <div class="ltext">Link do obrazka:</div>
          <input bind:value={image} placeholder="Wklej link do obrazka..." />
        </div>
        {/if}

        <div class="link-row checkbox-row">
          <div class="ltext">Pokaż statystyki:</div>
          <input type="checkbox" bind:checked={showStats} />
        </div>
          <div class="link-row checkbox-row">
            <div class="ltext">Tryb edycji:</div>
            <input type="checkbox" bind:checked={editMode} />
          </div>
      </div>

      {#if editMode && hasExtraLayer}
      <div class="form-container">
        <div class="link-row">
          <div class="ltext">Usuń tło (scalp):</div>
          <select bind:value={bgModel} disabled={bgRemoving}>
            <option value="small">Szybki (~40 MB)</option>
            <option value="medium">Dokładny (~80 MB)</option>
          </select>
        </div>
        <div class="link-row btn-row">
          <button class="btn" style="background: #7c3aed;" on:click={removeBg} disabled={bgRemoving}>
            {bgRemoving ? bgProgressLabel : 'Usuń tło'}
          </button>
        </div>
        {#if bgRemoving}
          <div class="bg-progress">
            <div class="bg-progress-bar" style="width: {bgProgress}%"></div>
          </div>
        {/if}
        {#if !bgRemoving && bgProgressLabel}
          <div class="bg-status" style="{bgProgressLabel.startsWith('Błąd') ? 'color:#f87171;' : 'color:#22c55e;'}">
            {bgProgressLabel.startsWith('Błąd') ? '✗ ' : '✓ '}{bgProgressLabel}
          </div>
        {/if}
      </div>
      {/if}

      <div class="form-container">
        <div class="link-row btn-row">
          <button class="btn" on:click={() => zoomLevel = zoomLevel === 1 ? 2 : 1}>
            Skala: {zoomLevel * 100}%
          </button>
          {#if editMode}
            <button class="btn" style="background: #22c55e;" on:click={downloadImage}>
              Pobierz obrazek
            </button>
          {/if}
        </div>
        {#if editMode}
          {#if hasExtraLayer}
            {#if extraImage}
              <div class="link-row centered-row">
                <div class="ltext">Wybierz warstwę:</div>
                <select bind:value={activeLayer}>
                  <option value="extra">Top</option>
                  <option value="base">Scalp</option>
                  <option value="both">Obie</option>
                </select>
                <button class="btn btn-small" style="background: #555;" on:click={resetZoom}>
                  Reset
                </button>
                {#if bgAutoLayer}
                  <button class="btn btn-small" style="background: #2563eb;" on:click={syncLayers}>
                    Sync
                  </button>
                {/if}
              </div>
            {:else}
              <div class="link-row btn-row">
                <button class="btn btn-small" style="background: #555;" on:click={resetZoom}>
                  Reset
                </button>
                {#if bgAutoLayer}
                  <button class="btn btn-small" style="background: #2563eb;" on:click={syncLayers}>
                    Sync
                  </button>
                {/if}
              </div>
            {/if}
          {:else}
            <div class="link-row btn-row">
              <button class="btn btn-small" style="background: #555;" on:click={resetZoom}>
                Reset
              </button>
              {#if bgAutoLayer}
                <button class="btn btn-small" style="background: #2563eb;" on:click={syncLayers}>
                  Sync
                </button>
              {/if}
            </div>
          {/if}
          <div class="floating-panel">
            <div class="info-label">SCALP
              X: {Math.round(crop.x)} | Y: {Math.round(crop.y)} {Math.round(pixelCrop.width)}x{Math.round(pixelCrop.height)}</div>
            {#if hasExtraLayer && extraImage}
              <div class="info-label">TOP
                X: {Math.round(extraCrop.x)} | Y: {Math.round(extraCrop.y)} {Math.round(extraPixelCrop.width)}x{Math.round(extraPixelCrop.height)}</div>
            {/if}
            <div class="dpad">
              <button on:click={() => moveCrop(0, -1)}>▲</button>
              <button on:click={() => moveCrop(0, 1)}>▼</button>
              <button on:click={() => moveCrop(-1, 0)}>◀</button>
              <button on:click={() => moveCrop(1, 0)}>▶</button>
            </div>
          </div>
        {/if}
      </div>
    </div>

  <div class="right-panel">
    <div class="scale-wrapper" bind:this={wrapperRef} style="width: {475 * finalScale}px; height: {667 * finalScale}px;">
      <div class="looks {editMode ? 'is-editing' : ''}" style="transform: scale({finalScale});">
        {#if editMode && hasExtraLayer && extraImage}
          <div class="cropper-container top" 
              style="--mask-url: url({extraMaskUrl}); pointer-events: {activeLayer === 'base' ? 'none' : 'auto'};">
            <Cropper 
              showGrid={false}
              image={extraImage} 
              bind:zoom={extraZoom} 
              bind:crop={extraCrop}
              disabled={activeLayer === 'base'}
              aspect={475/667}
              minZoom={0.1}
              maxZoom={10}
              zoomSpeed={0.02}
              cropSize={maskCropSize}
              on:cropcomplete={previewExtraCrop}
              restrictPosition={false}
            />
          </div>
          {#if isExtraUpscaling}
            <div class="upscale-border"></div>
          {/if}
        {/if}

          {#if backBorderUri}
            <img src={backBorderUri} class="back" alt="BorderBack" />
          {/if}
          
          {#if editMode}
            <div class="green-bg" style="-webkit-mask-image: url({currentMaskUrl}); mask-image: url({currentMaskUrl}); -webkit-mask-size: 100% 100%; mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;"></div>
            <div class="cropper-container" 
                style="--mask-url: url({currentMaskUrl}); pointer-events: {activeLayer === 'extra' ? 'none' : 'auto'};">
              <Cropper 
                showGrid={false}
                {image} 
                bind:zoom={curzoom} 
                bind:crop={crop} 
                minZoom={0.1}
                maxZoom={10}
                zoomSpeed={0.02}
                aspect={475/667}
                cropSize={maskCropSize} 
                on:cropcomplete={previewCrop} 
                restrictPosition={false} 
              />
            </div>
            <div class="crop-border"></div>
            {#if isUpscaling}
              <div class="upscale-border"></div>
            {/if}
          {:else}
            <img src={image} class="scalp" alt="Scalpel" />
          {/if}
  
          {#if borderUri}
            <img src={borderUri} class="border" alt="Border" />
          {/if}
  
          {#if dereUri}
            <img src={dereUri} class="dere" alt="Dere" />
          {/if}
  
          {#if showStats && statsUri}
            <img src={statsUri} class="stats" alt="Stats" />
          {/if}
          
      </div>
    </div>
  </div>
  </div>

</main>

<style>
  .logo-container {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
  }

  .logo {
    height: 6em;
    will-change: filter;
    transition: filter 300ms;
  }

  .app-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 15px;
  }

  .left-panel, .right-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .selector {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;
	width: 100%;
  }
  
  .selector label {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  .stext {
    font-weight: bold;
  }

  .bg-progress {
    width: 100%;
    height: 6px;
    background: rgba(128,128,128,0.2);
    border-radius: 3px;
    margin-top: 6px;
    overflow: hidden;
  }

  .bg-progress-bar {
    height: 100%;
    background: #7c3aed;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .bg-status {
    font-size: 0.8em;
    color: #22c55e;
    text-align: center;
    margin-top: 4px;
  }

  .form-container {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
  }

  .link-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 12px;
    gap: 10px;
  }

  .ltext {
    flex: 0 0 130px;
    text-align: right;
    font-size: 0.95em;
  }

  .dropzone {
    flex: 1;
    border: 1px dashed #3c3c3c;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50px;
  }

  .dropzone.drag-over {
    border-color: #4CAF50;
    background: #1e2e1e;
  }

  .file-input {
    width: 100%;
    cursor: pointer;
    margin: 0 !important;
    padding: 5px;
    outline: none;
    font-size: 0.9em;
  }
  
  .file-input:hover {
	border-color: #646cff;
  }
  
  .checkbox-row {
    display: flex;
    flex-direction: row !important;
    align-items: flex-start;
    justify-content: flex-start;
    margin-top: 10px;
  }
  
  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 15px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
    width: 160px;
  }
  
  .btn:hover {
    background: #646cff;
  }

  .btn-row {
    justify-content: center;
    gap: 10px;
    margin-top: 10px;
  }

  .btn-small {
    width: auto;
    padding: 6px 14px;
    flex-shrink: 0;
  }

  .right-panel {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .scale-wrapper {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    overflow: visible;
    transition: width 0.2s, height 0.2s;
  }

  .looks {
    position: relative;
    width: 475px; 
    height: 667px; 
    background-color: transparent;
    transform-origin: top left;
    flex-shrink: 0;
  }

  .looks img {
    position: absolute;
    top: 0;
    left: 0;
    width: 475px;
    height: 667px;
    pointer-events: none;
    display: block;
    image-rendering: pixelated;
  }

  .back { z-index: 10; }
  .scalp, .cropper-container:not(.top) { z-index: 20; }
  .top, .cropper-container.top { z-index: 30; }
  .border { z-index: 40; }
  .dere { z-index: 50; }
  .stats { z-index: 60; }
  
  .info-label {
    font-size: 0.75em;
    letter-spacing: 0.05em;
    color: #aaa;
    margin-bottom: 2px;
  }

  .upscale-border {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    outline: 4px solid #ff6242;
    outline-offset: -4px;
    pointer-events: none;
    z-index: 999;
  }

  /* Ukryj wbudowaną linię obszaru Croppera - zastępujemy własnym divem poza maską */
  :global(.reactEasyCrop_CropArea) {
    border: none !important;
    box-shadow: none !important;
    color: transparent !important;
  }
  
  .green-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 475px;
    height: 667px;
    background: #00ff00;
    z-index: 15;
    pointer-events: none;
  }

  .crop-border {
    position: absolute;
    top: 0;
    left: 0;
    width: 475px;
    height: 667px;
    outline: 1px solid rgba(255, 255, 255, 0.5);
    outline-offset: -1px;
    pointer-events: none;
    z-index: 999;
  }

  .cropper-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 475px;
    height: 667px;
  }

  .looks.is-editing .cropper-container {
    -webkit-mask-image: var(--mask-url);
    mask-image: var(--mask-url);
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }

  @media (max-width: 550px){
    .selector label {
    display: flex;
    flex-direction: column;
	align-items: center;
    gap: 5px;
    white-space: nowrap;
	}

	.link-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
      margin-bottom: 15px;
    }

    .link-row.checkbox-row {
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }

    .ltext {
      flex: 0 0 auto;
      width: 100%;
      text-align: center;
    }

    .checkbox-row .ltext {
      width: auto;
    }

    input:not([type="checkbox"]), .dropzone {
      width: 100% !important;
    }

    .btn-row {
      justify-content: center;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .centered-row {
      align-items: center;
    }
  }

  @media (min-width: 900px) {
    .app-layout {
      flex-direction: row;
      justify-content: center;
      align-items: flex-start;
      gap: 15px;
      margin-top: 5px;
      padding: 0 20px;
    }

    .left-panel {
      width: auto;
      max-width: 550px;
      align-items: center;
    }

    .selector {
      flex-wrap: nowrap;
      justify-content: flex-start;
      margin-bottom: 25px;
    }
  }
</style>