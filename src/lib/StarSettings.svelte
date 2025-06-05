<script>
  let starCount = [ 0, 1, 2, 3, 4, 5, 6 ]

  let starColors = [ 'Bronze', 'Silver', 'Gold', 'Blue', 'Green', 'Red', 'Purple', 'Black', 'White', 'Candy', 'Vapor', 'Neon', 'Rainbow' ]

  let starShapes = [ 'Triangle', 'Rhombus', 'Pentagon',  'Star', 'DualStar' ]

  let starTypes = [ 'Full', 'Empty' ]

  let starCnt = 0;
  let starShape = 'Star';
  let starColor = 'Blue';
  let starType = 'Full';

  function getName(e) {
  	return `/star/${starType}/${starColors.indexOf(starColor)+1}_${starShapes.indexOf(starShape)+1}.png`;
  }

  let selectedValue = getName();

  export { selectedValue as value };
  export { starCnt as count };
</script>

<label><div class="stext">Gwiazdki:</div> <select class="nselect" bind:value={starCnt} on:change={() => selectedValue = getName() }>
  {#each starCount as value}<option {value}>{value}</option>{/each}
</select></label>

<label><div class="stext">Kształt:</div> <select class="nselect" bind:value={starShape} on:change={() => selectedValue = getName() }>
  {#each starShapes as value}<option {value}>{value}</option>{/each}
</select></label>

<label><div class="stext">Kolor:</div> <select class="nselect" bind:value={starColor} on:change={() => selectedValue = getName() }>
  {#each starColors as value}<option {value}>{value}</option>{/each}
</select></label>

<label><div class="stext">Typ:</div> <select class="nselect" bind:value={starType} on:change={() => selectedValue = getName() }>
  {#each starTypes as value}<option {value}>{value}</option>{/each}
</select></label>

<style>
  .stext {
    display: inline-block;
    padding-left: 0.5em;
    padding-right: 0.2em;
  }
</style>