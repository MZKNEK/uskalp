<script>

  import logo from '/pwlogo.png'

  let stylesEta = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
     '11', '12', '13', '14', '15', '16', '17', '18' ]

  let stylesDelta = [ '0', '1', '2' ]

  let borders = [ 'Alpha', 'Beta', 'Delta', 'Eta', 'Epsilon', 'Gamma', 'Jota', 'Lambda', 'Theta', 'Zeta' ]

  let deres = [ 'Bodere', 'Dandere', 'Deredere', 'Kamidere', 'Kuudere', 'Mayadere',
    'Tsundere', 'Yandere', 'Raito', 'Yami', 'Yato' ]

  let image = "https://sanakan.pl/i/ss/sUwh3io.png";
  let customBorder = "";
  let showStats = false;
  let localImage = false;

  let selectedBorder = 'Delta';
  let selectedDere = 'Mayadere';
  let selectedStyle = '2'

  let fileinput;

  function onFileSelected(e) {
  	let imageFile = e.target.files[0];
    let reader = new FileReader();
  	reader.onload = e => {
      image = e.target.result;
      localImage = true;
  	};
  	reader.readAsDataURL(imageFile);
  }

  function getStyleList() {
    switch (selectedBorder) {
      case 'Delta':
        return stylesDelta;
      case 'Eta':
        return stylesEta;
      default:
        return null;
    }
  }

  let styles = getStyleList();

  function getStyle() {
    switch (selectedBorder) {
      case 'Delta':
        if (parseInt(selectedStyle) > 2)
          selectedStyle = '0';
      case 'Eta':
        if (parseInt(selectedStyle) > 0)
          return selectedStyle;
      default:
        return "";
    }
  }

  function getBorder() {
    switch (selectedBorder) {
      case 'Beta':
      case 'Epsilon':
      case 'Gamma':
      case 'Theta':
        return "";
      default:
        return `/borders/${selectedBorder}/Border${styleUri}.png`;
    }
  }

  function getBackBorder() {
    switch (selectedBorder) {
      case 'Jota':
          return `/borders/${selectedBorder}/Border/${selectedDere}.png`;
      case 'Delta':
      case 'Eta':
      case 'Lambda':
        return `/borders/${selectedBorder}/BorderBack${styleUri}.png`;
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
        return `/borders/${selectedBorder}/Border/${selectedDere}.png`
      default:
        return `/borders/${selectedBorder}/Dere/${selectedDere}.png`;
    }
  }

  function getStats() {
    switch (selectedBorder) {
      case 'Lambda':
      case 'Zeta':
        return "";
      case 'Gamma':
      case 'Jota':
      case 'Theta':
        return `/borders/${selectedBorder}/Stats/${selectedDere}.png`;
      case 'Beta':
      case 'Epsilon':
        if (selectedDere === 'Yami' || selectedDere === 'Raito' || selectedDere === 'Yato')
          return `/borders/${selectedBorder}/Stats/${selectedDere}.png`
      default:
        return `/borders/${selectedBorder}/Stats${styleUri}.png`;
    }
  }

  let styleUri = getStyle();
  let borderUri = getBorder();
  let backBorderUri = getBackBorder();
  let statsUri = getStats();
  let dereUri = getDere();

  function updateData() {
    styles = getStyleList();
    styleUri = getStyle();
    borderUri = getBorder();
    backBorderUri = getBackBorder();
    statsUri = getStats();
    dereUri = getDere();
  }

</script>

<main>
  <div>
    <a href="https://sanakan.pl" target="_blank" rel="noreferrer"> <img src={logo} class="logo" alt="Logo" /> </a>
  </div>

  <div class="selector">
    <label><div class="stext">Ramka:</div> <select bind:value={selectedBorder} on:change={() => updateData()} >
      {#each borders as value}<option {value}>{value}</option>{/each}
    </select></label>

    <label><div class="stext">Dere:</div> <select class="nselect" bind:value={selectedDere} on:change={() => updateData()} >
      {#each deres as value}<option {value}>{value}</option>{/each}
    </select></label>

    {#if styles}
      <label><div class="stext">Styl:</div> <select class="nselect" bind:value={selectedStyle} on:change={() => updateData()} >
        {#each styles as value}<option {value}>{value}</option>{/each}
      </select></label>
    {/if}
  </div>

  <div class="selector">
    <label><div class="ltext">Lokalny plik:</div><input type="file" accept=".jpg, .jpeg, .png" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} ></label><br/>
    {#if !localImage}
      <label><div class="ltext">Link do obrazka:</div> <input bind:value={image} /> </label><br/>
    {/if}
    <label><div class="ltext">Link do ramki:</div> <input bind:value={customBorder} /> </label><br/>
    <label><div class="ltext">Pokaż statystyki:</div> <input type="checkbox" bind:checked={showStats} /> </label><br/>
  </div>
  <div class="looks">
    <img src={image} class="scalp" alt="Scalpel" />
      {#if customBorder}
        <img src={customBorder} class="border" alt="Border" />
      {:else}
        {#if backBorderUri}
          <img src="{backBorderUri}" class="back" alt="BorderBack" />
        {/if}

        {#if borderUri}
          <img src="{borderUri}"  class="border" alt="Border" />
        {/if}

        {#if dereUri}
          <img src="{dereUri}" class="dere" alt="Dere" />
        {/if}

        {#if showStats && statsUri}
          <img src="{statsUri}" class="stats" alt="Stats" />
        {/if}
      {/if}
  </div>
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
  .scalp {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 475px;
    height: auto;
    pointer-events: none;
    clip-path: xywh(0 0 100% 667px);
  }
  .border {
    position: relative;
    pointer-events: none;
    z-index: 1;
  }
  .dere {
    position: absolute;
    pointer-events: none;
    z-index: 2;
    top: 0px;
    left: 0px;
  }
  .back {
    position: absolute;
    pointer-events: none;
    z-index: -1;
    top: 0px;
    left: 0px;
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
