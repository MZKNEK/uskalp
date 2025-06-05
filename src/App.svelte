<script>
  import Stars from './lib/StarSettings.svelte';

  import Cropper from "svelte-easy-crop";
	import { getCroppedImg, getMirroredImg } from "./lib/CanvasUtils.js"

  import logo       from '/pwlogo.png'
  import cardboard  from './assets/empty.png'
  import def        from './assets/shield.png'
  import fire       from './assets/fire.png'
  import health     from './assets/heart.png'

  let borders = [ 'SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E' ]

  let deres = [ 'Bodere', 'Dandere', 'Deredere', 'Kamidere', 'Kuudere', 'Mayadere',
    'Tsundere', 'Yandere', 'Raito', 'Yami', 'Yato' ]

  let image = "https://sanakan.pl/i/ss/fga432a.png";
  let customBorder = "";
  let showStats = false;
  let editMode = false;
  let localImage = false;
  let mirrorImage = false;

  let starCntComp = 0;
  let selectedStarComp;
  let selectedBorder =  'C';
  let selectedDere = 'Kamidere';

  let pixelCrop, profilePicture, style, borderColor, fileinput, minzoom, curzoom;

  async function downloadImage() {
    try {
      const croppedImage = await getCroppedImg(image, pixelCrop);
      const downloadLink = document.createElement("a");
      downloadLink.href = croppedImage;
      downloadLink.download = "skalpelek.png";
      downloadLink.click();
    } catch (error) {
      alert("Nie udało się pobrać obrazka, spróbuj z innym lub użyj lokalnego pliku.");
    }
	}

  async function toMirrorImage() {
    try {
      const croppedImage = await getMirroredImg(image);
      image = croppedImage;
      localImage = true;
    } catch (error) {
      alert("Nie udało się pobrać obrazka, spróbuj z innym lub użyj lokalnego pliku.");
    }
  }

  function onFileSelected(e) {
  	let imageFile = e.target.files[0];
    let reader = new FileReader();
  	reader.onload = e => {
      image = e.target.result;
      localImage = true;
  	};
  	reader.readAsDataURL(imageFile);
    editMode = false;
    minzoom = 1;
    curzoom = 1;
  }

  function previewCrop(e) {
		pixelCrop = e.detail.pixels;
		const { x, y, width } = e.detail.pixels;
		const scale = 448 / width;

    const hd = -y*scale;
    const wd = -x*scale - 448 / 2;
    const wdn = profilePicture.naturalWidth * scale;

    borderColor = (pixelCrop.width < 448 || pixelCrop.height < 650) ? "#ff6242" : "";

    const dratio = 448 / 650;
    const nratio = profilePicture.naturalWidth / profilePicture.naturalHeight;
    const mratio = dratio / nratio;
    minzoom = mratio > 1 ? mratio : 1;
    curzoom = curzoom < minzoom ? minzoom : curzoom;

		profilePicture.style=`margin: ${hd}px 0 0 ${wd}px; width: ${wdn}px;`
	}
</script>

<main>
  <div>
    <a href="https://sanakan.pl" target="_blank" rel="noreferrer"> <img src={logo} class="logo" alt="Logo" /> </a>
  </div>

  <div class="selector">
    <label><div class="stext">Ramka:</div> <select bind:value={selectedBorder} >
      {#each borders as value}<option {value}>{value}</option>{/each}
    </select></label>

    <label><div class="stext">Dere:</div> <select class="nselect" bind:value={selectedDere} >
      {#each deres as value}<option {value}>{value}</option>{/each}
    </select></label>
  </div>

  <div class="selector">
    <Stars bind:value={selectedStarComp} bind:count={starCntComp}/>
  </div>

  <div class="selector">
    <label><div class="ltext">Lokalny plik:</div><input type="file" accept=".jpg, .jpeg, .png" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} ></label><br/>
    {#if !localImage}
      <label><div class="ltext">Link do obrazka:</div> <input bind:value={image} /> </label><br/>
    {/if}
    <label><div class="ltext">Link do ramki:</div> <input bind:value={customBorder} /> </label><br/>
    <label><div class="ltext">Pokaż statystyki:</div> <input type="checkbox" bind:checked={showStats} /> </label><br/>
    <label class="mirror"><div class="ltext">Odbicie lustrzane:</div> <input type="checkbox" bind:checked={mirrorImage} on:change={() => toMirrorImage()}/> </label><br/>
    <label class="exp"><div class="ltext">Tryb edycji:</div> <input type="checkbox" bind:checked={editMode} on:change={() => borderColor = ""} /> </label><br/>
  </div>
  <div class="looks" style="border-color: {borderColor};" >
    <img src={cardboard} class="cardboard" alt="Cardboard" />
    {#if editMode}
      <div class="wrapper">
        <img bind:this={profilePicture} src={image} class="wrapper_img" alt="Scalpel" style={style}/>
      </div>
      <div class="canva">
        <Cropper {image} showGrid={false} crop={{x:0, y:0}} bind:zoom={curzoom} bind:minZoom={minzoom} maxZoom={5} zoomSpeed={0.05} cropSize={{width:448, height:650}} restrictPosition={true} on:cropcomplete={previewCrop} />
      </div>
    {:else}
      <img src={image} class="scalp" alt="Scalpel" />
    {/if}
      {#if customBorder}
        <img src={customBorder} class="border" alt="Border" />
      {:else}
        <img src="/borders/{selectedBorder}.png" class="border" alt="Border" />
        <img src="/dere/{selectedDere}.png" class="stats" alt="Dere" />

        {#if showStats}
          <img src={def} class="stats" alt="Defense" />
          <img src={fire} class="stats" alt="Attack" />
          <img src={health} class="stats" alt="Health" />
        {/if}

        {#if starCntComp > 0}
          {#each {length: starCntComp} as _, i}
            <img src={selectedStarComp} class="star" alt="Star" style="left: {239 - (19 * starCntComp) + (38 * i)}px;"/>
          {/each}
        {/if}

      {/if}
  </div>
  {#if editMode}
  <div class="editor">
    <button type="button" on:click={async () => {downloadImage()}}>Zapisz</button>
  </div>
  {/if}
</main>

<style>
  .logo {
    height: 6em;
    will-change: filter;
    transition: filter 300ms;
  }
  .ltext {
    display: inline-block;
    width: 130px;
    text-align: left;
  }
  .stext {
    display: inline-block;
    padding-left: 0.5em;
    padding-right: 0.2em;
  }
  .looks {
    position: relative;
    width: 475px;
    height: 667px;
  }
  .canva {
    position: absolute;
    width: 448px;
    height: 650px;
    top: 13px;
    left: 13px;
    z-index: 0;
  }
  .cardboard {
    position: absolute;
    pointer-events: none;
    top: 13px;
    left: 13px;
  }
  .wrapper {
    position: absolute;
    top: 13px;
    left: 13px;
    width: 448px;
    height: 650px;
    overflow: hidden;
    z-index: -1;
  }
  .editor {
    padding: 0.5em;
  }
  .wrapper_img {
    position: absolute;
  }
  .scalp {
    position: absolute;
    top: 13px;
    left: 13px;
    width: 448px;
    height: auto;
    pointer-events: none;
    clip-path: xywh(0 0 100% 650px);
  }
  .border {
    position: relative;
    pointer-events: none;
    z-index: 1;
  }
  .star {
    position: absolute;
    pointer-events: none;
    z-index: 3;
    top: 30px;
  }
  .stats {
    position: absolute;
    pointer-events: none;
    z-index: 3;
    top: 0px;
    left: 0px;
  }
  .selector {
    width: 475px;
    padding-bottom: 1em;
  }
</style>
