document.addEventListener("DOMContentLoaded", () => {
    const arrayContainer = document.getElementById("arrayContainer");
    const sizeSlider = document.getElementById("sizeSlider");
    const speedSlider = document.getElementById("speedSlider");
    const generateBtn = document.getElementById("generateBtn");
    const loadCustomBtn = document.getElementById("loadCustomBtn");
    const customArrayInput = document.getElementById("customArray");
    const sortBtn = document.getElementById("sortBtn");

    let array = []; // Array of objects { val, element, x, y }
    let isSorting = false;
    let abortController = new AbortController();

    // Initialize
    // Use setTimeout to ensure container dimensions are computed
    setTimeout(generateArray, 50);
    window.addEventListener('resize', () => {
        if (!isSorting) generateArray();
    });

    // Event Listeners
    sizeSlider.addEventListener("input", () => {
        if (!isSorting) generateArray();
    });

    generateBtn.addEventListener("click", () => {
        if (isSorting) {
            abortController.abort();
            abortController = new AbortController();
            isSorting = false;
        }
        generateArray();
    });

    loadCustomBtn.addEventListener("click", () => {
        if (isSorting) {
            abortController.abort();
            abortController = new AbortController();
            isSorting = false;
        }
        
        const inputVal = customArrayInput.value.trim();
        if (!inputVal) return;
        
        const parts = inputVal.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        const uniqueParts = [...new Set(parts)];
        
        if (uniqueParts.length > 0) {
            generateArray(uniqueParts);
        }
    });

    sortBtn.addEventListener("click", async () => {
        if (isSorting) return;
        isSorting = true;
        toggleControls(true);
        
        try {
            await quicksort(0, array.length - 1, abortController.signal);
            // Mark all as sorted when done
            if (!abortController.signal.aborted) {
                for (let i = 0; i < array.length; i++) {
                    array[i].element.className = "array-element sorted";
                    await sleep(30, abortController.signal);
                }
            }
        } catch (e) {
            console.log("Sorting aborted", e);
        } finally {
            isSorting = false;
            toggleControls(false);
        }
    });

    function generateArray(customValues = null) {
        array = [];
        arrayContainer.innerHTML = "";
        
        let size = parseInt(sizeSlider.value);
        let valuesToUse = [];
        
        if (customValues) {
            size = customValues.length;
            valuesToUse = customValues;
            sizeSlider.value = size;
        } else {
            const usedValues = new Set();
            for (let i = 0; i < size; i++) {
                let val;
                do {
                    val = Math.floor(Math.random() * 96) + 5;
                } while (usedValues.has(val));
                usedValues.add(val);
                valuesToUse.push(val);
            }
        }
        
        const containerWidth = arrayContainer.clientWidth || window.innerWidth * 0.9;
        const containerHeight = arrayContainer.clientHeight || window.innerHeight * 0.6;
        
        // Calculate grid layout
        const cols = Math.ceil(Math.sqrt(size * (containerWidth / containerHeight)));
        const rows = Math.ceil(size / cols);
        
        const cellWidth = containerWidth / cols;
        const cellHeight = containerHeight / rows;
        
        // Element size (slightly smaller than cell)
        const sizeRatio = Math.max(0.3, 50 / size);
        const fontSize = Math.max(12, sizeRatio * 20);
        
        const elWidth = Math.min(cellWidth * 0.8, 60);
        const elHeight = Math.min(cellHeight * 0.8, 60);

        for (let i = 0; i < size; i++) {
            const val = valuesToUse[i];
            
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            const x = col * cellWidth + (cellWidth - elWidth) / 2;
            const y = row * cellHeight + (cellHeight - elHeight) / 2;

            const bar = document.createElement("div");
            bar.classList.add("array-element");
            bar.innerText = val;
            
            bar.style.width = `${elWidth}px`;
            bar.style.height = `${elHeight}px`;
            bar.style.fontSize = `${fontSize}px`;
            bar.style.left = `${x}px`;
            bar.style.top = `${y}px`;
            
            arrayContainer.appendChild(bar);
            
            array.push({
                val: val,
                element: bar,
                x: x,
                y: y
            });
        }
    }

    function toggleControls(disabled) {
        sizeSlider.disabled = disabled;
        customArrayInput.disabled = disabled;
        loadCustomBtn.disabled = disabled;
        if (disabled) {
            generateBtn.innerText = "Stop & Reset";
            generateBtn.classList.remove("secondary");
            generateBtn.classList.add("primary");
            generateBtn.style.background = "var(--color-pivot)";
            
            sortBtn.disabled = true;
        } else {
            generateBtn.innerText = "Generate Random";
            generateBtn.classList.remove("primary");
            generateBtn.classList.add("secondary");
            generateBtn.style.background = "";
            
            sortBtn.disabled = false;
        }
    }

    function getDelay() {
        // Max speed = 100, Min speed = 1
        const speed = parseInt(speedSlider.value);
        return Math.floor(500 - (speed * 4.9)); // Slower max to see animation
    }

    function sleep(ms, signal) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, ms);
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    reject(new DOMException("Aborted", "AbortError"));
                });
            }
        });
    }

    function setBarState(index, stateClass) {
        if (array[index]) {
            array[index].element.className = `array-element ${stateClass}`;
        }
    }

    async function swapBars(i, j) {
        const itemI = array[i];
        const itemJ = array[j];
        
        // Swap coordinates
        const tempX = itemI.x;
        const tempY = itemI.y;
        
        itemI.x = itemJ.x;
        itemI.y = itemJ.y;
        
        itemJ.x = tempX;
        itemJ.y = tempY;
        
        // Apply to DOM
        itemI.element.style.left = `${itemI.x}px`;
        itemI.element.style.top = `${itemI.y}px`;
        
        itemJ.element.style.left = `${itemJ.x}px`;
        itemJ.element.style.top = `${itemJ.y}px`;

        // Swap in array reference
        array[i] = itemJ;
        array[j] = itemI;
    }

    async function partition(low, high, signal) {
        let pivotIndex = high;
        let pivotValue = array[pivotIndex].val;
        
        setBarState(pivotIndex, "pivot");
        let i = low - 1;

        for (let j = low; j < high; j++) {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError");
            
            setBarState(j, "compare");
            await sleep(getDelay(), signal);

            if (array[j].val < pivotValue) {
                i++;
                if (i !== j) {
                    setBarState(i, "compare");
                    await sleep(getDelay(), signal);
                    await swapBars(i, j);
                    setBarState(i, "");
                }
            }
            setBarState(j, "");
        }

        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        
        if (i + 1 !== high) {
            setBarState(i + 1, "compare");
            await sleep(getDelay(), signal);
            await swapBars(i + 1, high);
        }
        
        setBarState(high, "");
        setBarState(i + 1, "sorted");
        
        return i + 1;
    }

    async function quicksort(low, high, signal) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        if (low < high) {
            let pi = await partition(low, high, signal);
            await quicksort(low, pi - 1, signal);
            await quicksort(pi + 1, high, signal);
        } else if (low === high) {
             setBarState(low, "sorted");
        }
    }
});
