const toggleButton = document.getElementById('begin');
        const centeredContent = document.getElementById('preamble');
        const gridContent = document.getElementById('gridContent');
        const container = document.getElementById('container');

        toggleButton.addEventListener('click', () => {
            centeredContent.classList.toggle('hidden');
            gridContent.classList.toggle('hidden');

            toggleButton.textContent = 
                toggleButton.textContent === 'Switch to Grid' 
                ? 'Switch to Center' 
                : 'Switch to Grid';

            // Animate tiles when switching to grid
            if (!gridContent.classList.contains('hidden')) {
                const tiles = document.querySelectorAll('.tile');
                tiles.forEach((tile, index) => {
                    // Reset tiles to hidden state
                    tile.classList.remove('tile-visible');
                    
                    // Add visible class with delay
                    setTimeout(() => {
                        tile.classList.add('tile-visible');
                    }, index * 100); // 100ms delay between each tile
                });
            }
        });