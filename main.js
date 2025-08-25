
// ###### Constant Global Variables ###### //
document.getElementById("zoom-level").value = DEFAULT_ZOOM

// ###### Initialize event handlers ###### //

// Set autosave event handlers
document.body.addEventListener('change', () => saveToLocalStorage())

// Attach input validation to all current and future inputs of name 'cclt' and 'release'
document.body.addEventListener('input', (e) => {
    const target = e.target
    if (
        target.matches('input[name="cclt"]') || 
        target.matches('input[name="release"]')
    ) {
        target.value = target.value.replace(/\D/g, '').slice(0, 6)
    }
})

// Attach global settings form to apply updates to all pages
document.querySelector('#global-settings').addEventListener('change', () => {
    updateAllPages()
})

// Attach Today date button:
document.querySelector('#set-today-date').addEventListener('click', () => setTodayDate())

// Attach Delete all pages button:
document.querySelector('#delete-all-pages').addEventListener('click', () => deleteAllPages())

// Attach Print Report button
document.querySelector('#print-page').addEventListener('click', () => window.print());

// Attach input validation to current date
document.querySelector('#custom-date').addEventListener('input', () => {
    const input = document.getElementById('custom-date')
    const value = input.value.trim()
    const isValid = /^\d{2} [A-Z][a-z]{2} \d{2}$/.test(value)

    input.classList.toggle('error', !isValid)
    return isValid
})

// Attach new page function to the new page button
document.querySelector('#new-page-button').addEventListener('click', () => { addNewPage() })


// ##### WEBPAGE INITIALIZATION ##### //

restoreFromLocalStorage() // Load any saved changes
setTodayDate() // Calling this after restoreFromLocalStorage will overwrite today's date to whatever was saved.

// Load new page if none are present
if (getPageCount() === 0){ 
    addNewPage() 
}

addLinks()

// ###### Image dropzone event handlers ###### //

function setupDropzone(dz) {

    // Click fallback for file selection
    dz.addEventListener('click', () => {
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = 'image/*'
        fileInput.onchange = () => handleFiles(fileInput.files, dz)
        fileInput.click()
    })

    // Drag events
    dz.addEventListener('dragover', (e) => {
        e.preventDefault()
        dz.classList.add('dragover')
    })

    dz.addEventListener('dragleave', () => {
        dz.classList.remove('dragover')
    })

    dz.addEventListener('drop', (e) => {
        e.preventDefault()
        dz.classList.remove('dragover')
        handleFiles(e.dataTransfer.files, dz)
    })
}

function handleFiles(files, dropzone) {
    const file = files[0]
    if (!file || !file.type.startsWith('image/')) return
        
    const container = dropzone.parentElement.querySelector('.screenshot-container')
    const img = container.querySelector('.screenshot')
    const removeBtn = container.querySelector('.remove-screenshot')

    const reader = new FileReader()
        reader.onload = (e) => {
        img.src = e.target.result
        container.style.display = 'block'
        dropzone.style.display = 'none'
        saveToLocalStorage()

        addMagnifier(container)
    }
    reader.readAsDataURL(file)

    removeBtn.onclick = () => {
        img.src = ''
        container.style.display = 'none'
        dropzone.style.display = 'flex'
        saveToLocalStorage()
    }
}

function addMagnifier(screenshotContainer) {
    const img = screenshotContainer.querySelector('.screenshot');
    if (!img) return;

    let glass, glassImg;

    // Only add magnifier once
    if (screenshotContainer.dataset.magnifierAttached) {
        glass = screenshotContainer.querySelector('.magnifier-glass');
        glassImg = glass.querySelector('img')
        glassImg.src = img.src;
        return
    };

    // Otherwise, create a new magnifier
    screenshotContainer.dataset.magnifierAttached = 'true';
    glass = document.createElement('div');
    glass.className = 'magnifier-glass';

    glassImg = document.createElement('img');
    glassImg.src = img.src;
    glass.appendChild(glassImg);

    screenshotContainer.appendChild(glass);
    screenshotContainer.style.position = 'relative';


    img.addEventListener('mouseenter', () => {
        if (document.getElementById('zoom-enabled').checked) {
            glass.style.display = 'block';
        }
        else{
            img.style.cursor = 'default';
        }
    })

    img.addEventListener('mouseleave', () => {
        glass.style.display = 'none'
    });

    img.addEventListener('mousemove', (e) => {
        if (!document.getElementById('zoom-enabled').checked) {
            return;
        }
        img.style.cursor = 'zoom-in';

        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left; // cursor inside the image
        const y = e.clientY - rect.top;

        const zoom = document.getElementById('zoom-level').value ?? DEFAULT_ZOOM;
        const glassWidth = glass.offsetWidth / 2;
        const glassHeight = glass.offsetHeight / 2;

        // cursor as proportion of image dimensions
        const xPercent = x / rect.width;
        const yPercent = y / rect.height;

        // position glass centered on cursor
        glass.style.left = `${x - glassWidth}px`;
        glass.style.top = `${y - glassHeight}px`;

        // position zoomed image inside glass based on proportion
        const zoomedWidth = rect.width * zoom ;
        const zoomedHeight = rect.height * zoom ;

        glassImg.style.width = `${zoomedWidth}px`;
        glassImg.style.height = `${zoomedHeight}px`;
        glassImg.style.left = `${-xPercent * zoomedWidth * 2 + glassWidth}px`;
        glassImg.style.top = `${-yPercent * zoomedHeight * 2 + glassHeight}px`;
    });
}



// ###### Page Add/Delete ###### //

function addNewPage(){

    const pageNumber = getPageCount() + 1

    // Clone template edit form
    const formTemplate = document.querySelector('#edit-form-hidden-template')
    const newForm = formTemplate.cloneNode(true)
    newForm.id = `edit-form-page-${pageNumber}`

    // Clone the page
    const pageTemplate = document.querySelector('#page-hidden-template')
    const newPage = pageTemplate.cloneNode(true)
    newPage.id = `page-${pageNumber}`

    // Set up preview container
    const edit_section = document.getElementById('edit-section')
    edit_section.appendChild(newForm)

    const pages_section = document.getElementById('pages-section')
    pages_section.appendChild(newPage)

    // Attach page event listener to edit form
    newForm.addEventListener('change', () => {updatePage(pageNumber)})

    // Attach delete page function to remove button.
    const deleteBtn = newPage.querySelector('.delete-page-button')
    deleteBtn.onclick = () => {
        newForm.remove()
        newPage.remove()
        reorderPages()
    }

    // Attach move page up function
    const upBtn = newPage.querySelector('.move-up')
    upBtn.onclick = () => {
        const prevPage = newPage.previousElementSibling
        const prevForm = newForm.previousElementSibling
        if (prevPage && prevForm) {
            newPage.parentElement.insertBefore(newPage, prevPage)
            newForm.parentElement.insertBefore(newForm, prevForm)
            reorderPages()
        }
    }

    // Attach move page down function
    const downBtn = newPage.querySelector('.move-down')
    downBtn.onclick = () => {
        const nextPage = newPage.nextElementSibling
        const nextForm = newForm.nextElementSibling
        if (nextPage && nextForm) {
            newPage.parentElement.insertBefore(nextPage, newPage)
            newForm.parentElement.insertBefore(nextForm, newForm)
            reorderPages()
        }
    }

    // Attach image dropzone listener to page
    setupDropzone(newPage.querySelector('.dropzone'))


    updatePage(pageNumber) // initialize lines
}

function reorderPages() {
    const pageNodes = document.querySelectorAll('#pages-section > .print-page')
    const formNodes = document.querySelectorAll('#edit-section > .edit-panel')

    pageNodes.forEach((page, i) => {
        page.id = `page-${i + 1}`
    })

    formNodes.forEach((form, i) => {
        form.id = `edit-form-page-${i + 1}`

        // Make sure change listener is refreshed with correct index
        form.onchange = () => updatePage(i + 1)
    })
    updateAllPages()
    saveToLocalStorage()
}

function getPageCount() {
    const pages = document.querySelectorAll('#pages-section > [id^="page-"]')
    return pages.length
}

function deleteAllPages() {
    if (!confirm("Are you sure you want to delete all pages?")) return;

    // Clear all page elements
    document.getElementById('edit-section').innerHTML = '';
    document.getElementById('pages-section').innerHTML = '';

    // Persist empty state
    saveToLocalStorage();

    // (Optional) Add back a blank page so the user isn't stuck with nothing
    addNewPage();
}

// ###### Input Parsing and Page Update Functions ###### //

function updatePage(page_number){

    const page = document.getElementById(`page-${page_number}`)
    const form = document.querySelector(`#edit-form-page-${page_number}`)
    const data = new FormData(form)

    const type = data.get('type') || ""
    const location = data.get('location') || ""
    const cclt = data.get('cclt') || ""
    const release = data.get('release') || ""
    const initial = data.get('initial') || ""
    const final = data.get('final') || ""
    const poi = data.get('poi') || ""

    const global_settings_element = document.querySelector(`#global-settings`)
    const global_settings = new FormData(global_settings_element)
    const active_site = global_settings.get('active_site')
    const current_date = global_settings.get('current_date')

    // Generate date or page number
    const header_page_number = page.querySelector(`.page-number`)
    if (page_number == 1){
        header_page_number.innerHTML = current_date
    }
    else{
        header_page_number.innerHTML = page_number
    }

    // Generate header if first page
    if (page_number === 1){
        const header_1 = page.querySelector('.first-page-header-1')
        header_1.innerHTML = line_templates["first-page-header-1"]

        const header_2 = page.querySelector('.first-page-header-2')
        header_2.innerHTML = line_templates["first-page-header-2"].replace('%s', active_site)
    }

    // Generate Subject line
    const subject = page.querySelector('.subject')

    const location_valid = location !== ""
    const location_checked = location_valid ? wrapInput(location) : wrapError("[NO LOCATION]")
    form.querySelector('[name="location"]').classList.toggle('error-border', !location_valid)


    const subject_text = line_templates["subject"].replace('%s', location_checked)
    subject.innerHTML = subject_text

    // Generate Line 1
    const line_1 = page.querySelector('.line-1')

    const type_valid = type !== ""
    const type_checked = type_valid ? wrapInput(type) : wrapError("[NO TYPE]")
    form.querySelector('[name="type"]').classList.toggle('error-border', !type_valid)

    const line_1_text = line_templates["line-1"].replace('%s', type_checked)
    line_1.innerHTML = line_1_text

    // Generate Line 2
    const line_2 = page.querySelector('.line-2')

    let line_2_text

    const cclt_valid = /^\d{6}$/.test(cclt)
    form.querySelector('[name="cclt"]').classList.toggle('error-border', !cclt_valid)

    const release_valid = /^\d{6}$/.test(release)
    form.querySelector('[name="release"]').classList.toggle('error-border', !release_valid)

    if (cclt_valid && release_valid) {
        const formatted_release = formatZuluDelta(cclt, release)
        line_2_text = line_templates["line-2"].replace('%s', wrapInput(formatted_release))
    } 
    else {
        let warning
        if (!cclt_valid && !release_valid) {
            warning = "[CCLT & RELEASE INVALID]"
        } 
        else if (!cclt_valid) {
            warning = "[CCLT INVALID]"
        } 
        else {
            warning = "[RELEASE INVALID]"
        }
        line_2_text = line_templates["line-2"].replace('%s', wrapError(warning))
    }

    line_2.innerHTML = line_2_text

    // Generate Line 3
    const line_3 = page.querySelector('.line-3')

    const line_3_text = line_templates["line-3"].replace('%s', wrapInput(initial + " / " + final))
    line_3.innerHTML = line_3_text

    // Generate Line 4
    const line_4 = page.querySelector('.line-4')

    const poi_valid = poi !== ""
    const poi_checked = poi_valid ? wrapInput(poi) : wrapError("[NO POI]")
    form.querySelector('[name="poi"]').classList.toggle('error-border', !poi_valid)
    
    let line_4_text = line_templates["line-4"].replace('%s', poi_checked)
    line_4.innerHTML = line_4_text

    // Generate Line 5
    const line_5 = page.querySelector('.line-5')
    line_5.innerHTML = line_templates["line-5"]
}

function updateAllPages() {
    const pageCount = getPageCount()
    for (let i = 1; i <= pageCount; i++) {
        updatePage(i)
    }
}

function wrapInput(text){
    return `<span class='user-input'>${text}</span>`
}

function wrapError(text) {
    return `<span class='error'>${text}</span>`
}

function parseZuluTime(hhmmss, dayOffset = 0) {
    const h = parseInt(hhmmss.slice(0, 2), 10)
    const m = parseInt(hhmmss.slice(2, 4), 10)
    const s = parseInt(hhmmss.slice(4, 6), 10)
    return new Date(Date.UTC(1970, 0, 1 + dayOffset, h, m, s))
}

function formatZuluDelta(ccltStr, releaseStr) {
    const cclt = parseZuluTime(ccltStr)
    let release = parseZuluTime(releaseStr)

    if (release < cclt) {
        // assume release is on the next day
        release = parseZuluTime(releaseStr, 1)
    }

    const deltaSec = Math.round((release - cclt) / 1000)
    const sign = deltaSec >= 0 ? '+' : '-'
    const absSec = Math.abs(deltaSec)
    const mm = Math.floor(absSec / 60)
    const ss = absSec % 60

    const pad = (n) => n.toString().padStart(2, '0')
    const releaseFormatted = `${pad(release.getUTCHours())}:${pad(release.getUTCMinutes())}:${pad(release.getUTCSeconds())}Z`
    const deltaFormatted = `(${sign}${pad(mm)}:${pad(ss)})`

    return `${releaseFormatted} ${deltaFormatted}`
}

function setTodayDate(){
    const dateInput = document.getElementById('custom-date')

    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = now.toLocaleString('en-US', { month: 'short' }) // e.g., "Aug"
    const year = String(now.getFullYear()).slice(-2)              // e.g., "25"

    dateInput.value = `${day} ${month} ${year}`
    document.body.dispatchEvent(new Event('change', { bubbles: true }));
    updateAllPages()
}

// ##### Links ##### //

function addLinks(){
    const link_div = document.getElementById("useful-links")
    Object.entries(links).forEach(([k, v]) => {
        const anchor = document.createElement('a')
        anchor.href = v
        anchor.innerText = k
        anchor.target = "_blank"; // Optional: open in new tab
        link_div.appendChild(anchor)
        link_div.appendChild(document.createTextNode(''));
    })
}

// ##### Local Storage (persist through refresh) ##### //

function serializeScreenshot(imgElement) {
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8); // Use jpeg for smaller size
}

function estimateSizeInBytes(obj) {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
}

function saveToLocalStorage() {
    console.log(`Saving ${getPageCount()} pages to local storage.`)
    const screenshotsEnabled = true;
    const data = {
        global: {
            active_site: document.querySelector('input[name="active_site"]:checked')?.value || 'A',
            current_date: document.getElementById('custom-date')?.value || '',
            zoom_enabled: document.getElementById('zoom-enabled')?.checked ?? false,
            zoom_level: document.getElementById('zoom-level')?.value || '',
        },
        pages: []
    };

    const pageForms = document.querySelectorAll('[id^="edit-form-page-"]');

    pageForms.forEach((form, i) => {
        const pageId = form.id.replace('edit-form-', '');
        const pageElement = document.getElementById(pageId);
        const img = pageElement?.querySelector('.screenshot');

        const formData = new FormData(form);

        const pageData = {
            location: formData.get('location') || '',
            type: formData.get('type') || '',
            cclt: formData.get('cclt') || '',
            release: formData.get('release') || '',
            initial: formData.get('initial') || '',
            final: formData.get('final') || '',
            poi: formData.get('poi') || ''
        };

        // Try to serialize screenshot (if visible)
        if (screenshotsEnabled) {
            if (img && img.src && img.src.startsWith('data:image')) {
                pageData.screenshot = img.src; // already base64
            }
        }

        data.pages.push(pageData);
    });

    // Estimate data size
    const estimatedSize = estimateSizeInBytes(data);

    try {
        if (estimatedSize > 4_500_000) { // ~4.5MB safety margin
            // Retry without screenshots
            data.pages.forEach(p => delete p.screenshot);
            localStorage.setItem('savedBuilderData', JSON.stringify(data));
            setWarningVisibility(true)
            console.warn("⚠️ Screenshots were too large to save. Form data was saved without images.");
        } else {
            localStorage.setItem('savedBuilderData', JSON.stringify(data));
        }
    } catch (e) {
        console.warn("Saving failed:", e);
        setWarningVisibility(true)
        console.warn("❌ Error saving data. Storage limit likely exceeded.");
    }
}

function setWarningVisibility(is_visible){
    document.querySelector(".warning-storage").style.display = is_visible ? "flex" : "none"
}

function restoreFromLocalStorage() {
    const raw = localStorage.getItem('savedBuilderData')
    if (!raw) return

    const data = JSON.parse(raw)

    // Restore global settings
    if (data.global) {
        document.getElementById('custom-date').value = data.global.current_date || ''
        const siteRadio = document.querySelector(`input[name="active_site"][value="${data.global.active_site}"]`)
        if (siteRadio) siteRadio.checked = true
        document.getElementById(`zoom-enabled`).checked = data.global.zoom_enabled ?? true
        document.getElementById(`zoom-level`).value = data.global.zoom_level || DEFAULT_ZOOM
    }

    // Remove any existing pages
    document.getElementById('edit-section').innerHTML = ''
    document.getElementById('pages-section').innerHTML = ''

    // Rebuild pages
    data.pages.forEach((pageData, i) => {
        addNewPage();
        const form = document.querySelector(`#edit-form-page-${i + 1}`);
        if (!form) return;

        form.querySelector('[name="location"]').value = pageData.location;
        form.querySelector('[name="type"]').value = pageData.type;
        form.querySelector('[name="cclt"]').value = pageData.cclt;
        form.querySelector('[name="release"]').value = pageData.release;
        form.querySelector(`[name="initial"][value="${pageData.initial}"]`).checked = true;
        form.querySelector(`[name="final"][value="${pageData.final}"]`).checked = true;
        form.querySelector('[name="poi"]').value = pageData.poi;

        // ✅ Restore screenshot if present
        if (pageData.screenshot) {
            const pageElement = document.querySelector(`#page-${i + 1}`);
            const dropzone = pageElement.querySelector('.dropzone');
            const container = pageElement.querySelector('.screenshot-container');
            const img = container.querySelector('.screenshot');

            img.src = pageData.screenshot;
            container.style.display = 'block';
            dropzone.style.display = 'none';

            addMagnifier(container); // ✅ attach magnifier to restored screenshot

            const removeBtn = container.querySelector('.remove-screenshot');
            removeBtn.onclick = () => {
                img.src = '';
                container.style.display = 'none';
                dropzone.style.display = 'flex';
                saveToLocalStorage();
            };
        }
        updatePage(i + 1) // Trigger rendering
    })
}
