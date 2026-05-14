/**
 * AI Captioner — Enterprise Frontend Logic
 * Includes Three.js 3D Background, GSAP Animations, Magnetic Buttons, and API communication.
 */

(function () {
    "use strict";

    // ─── Three.js Abstract 3D Background ───
    function initThreeJS() {
        const container = document.getElementById('canvas-container');
        if (!container || !window.THREE) return;

        const scene = new THREE.Scene();
        // Add a slight dark fog
        scene.fog = new THREE.FogExp2(0x050505, 0.002);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;
        camera.position.y = 10;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Create Particles
        const geometry = new THREE.BufferGeometry();
        const particlesCount = 1500;
        const posArray = new Float32Array(particlesCount * 3);

        for(let i = 0; i < particlesCount * 3; i++) {
            // Spread particles across a wide landscape
            posArray[i] = (Math.random() - 0.5) * 100;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const material = new THREE.PointsMaterial({
            size: 0.05,
            color: 0x00F0FF,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const particlesMesh = new THREE.Points(geometry, material);
        scene.add(particlesMesh);

        // Mouse Interactivity
        let mouseX = 0;
        let mouseY = 0;
        document.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX / window.innerWidth) - 0.5;
            mouseY = (event.clientY / window.innerHeight) - 0.5;
        });

        // Animation Loop
        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            // Rotate mesh slowly
            particlesMesh.rotation.y = elapsedTime * 0.05;
            
            // Add a wave effect to particles
            const positions = geometry.attributes.position.array;
            for(let i = 0; i < particlesCount; i++) {
                const i3 = i * 3;
                const x = positions[i3];
                const z = positions[i3 + 2];
                // Y axis wave
                positions[i3 + 1] = Math.sin(elapsedTime * 0.5 + x * 0.2) * 2 + Math.cos(elapsedTime * 0.3 + z * 0.2) * 2;
            }
            geometry.attributes.position.needsUpdate = true;

            // Camera movement based on mouse
            camera.position.x += (mouseX * 10 - camera.position.x) * 0.05;
            camera.position.y += (-mouseY * 10 + 10 - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        }
        animate();

        // Handle Resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // ─── GSAP Scroll Animations ───
    function initGSAP() {
        if (typeof gsap === 'undefined') return;
        gsap.registerPlugin(ScrollTrigger);

        // Header fade down
        gsap.fromTo(".gs-fade-down", 
            { y: -50, opacity: 0, autoAlpha: 0 }, 
            { y: 0, opacity: 1, autoAlpha: 1, duration: 1, ease: "power3.out" }
        );

        // Hero fade up
        gsap.fromTo(".gs-fade-up", 
            { y: 40, opacity: 0, autoAlpha: 0 }, 
            { y: 0, opacity: 1, autoAlpha: 1, duration: 1, stagger: 0.2, ease: "power3.out", delay: 0.2 }
        );

        // Card Zoom In
        gsap.fromTo(".gs-zoom-in",
            { scale: 0.95, opacity: 0, autoAlpha: 0 },
            { scale: 1, opacity: 1, autoAlpha: 1, duration: 0.8, ease: "back.out(1.2)", delay: 0.4 }
        );
    }

    // ─── Prisma Hero Animations ───
    function initPrismaHero() {
        const titleContainer = document.getElementById("prisma-title");
        if (!titleContainer) return;

        // Populate title text
        const words = ["AI", "Captioner"];
        words.forEach((word, index) => {
            const wordSpan = document.createElement("span");
            wordSpan.className = "inline-block relative gs-prisma-word mr-[0.25em]";
            wordSpan.textContent = word;
            
            // Add asterisk to the last word
            if (index === words.length - 1) {
                wordSpan.classList.remove("mr-[0.25em]");
                const asterisk = document.createElement("span");
                asterisk.className = "absolute top-[0.4em] -right-[0.3em] text-[0.4em] text-[#00F0FF]";
                asterisk.textContent = "*";
                wordSpan.appendChild(asterisk);
            }
            
            titleContainer.appendChild(wordSpan);
        });

        if (typeof gsap === 'undefined') return;

        // Animate title
        gsap.fromTo(".gs-prisma-word", 
            { y: 40, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2 }
        );

        // Animate description
        gsap.fromTo(".gs-prisma-desc", 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.5 }
        );

        // Animate button
        gsap.fromTo(".gs-prisma-btn", 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.7 }
        );
    }

    // ─── Magnetic & 3D Tilt Effects ───
    function initInteractions() {
        // 3D Tilt on Upload Card
        const tiltWrapper = document.getElementById("tilt-wrapper");
        const glassCard = document.querySelector(".upload-card");

        if (tiltWrapper && glassCard) {
            tiltWrapper.addEventListener("mousemove", (e) => {
                const rect = tiltWrapper.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = ((y - centerY) / centerY) * -4; // Max 4 deg
                const rotateY = ((x - centerX) / centerX) * 4;
                
                glassCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            tiltWrapper.addEventListener("mouseleave", () => {
                glassCard.style.transform = `rotateX(0deg) rotateY(0deg)`;
            });
        }

        // Magnetic Buttons
        const magnets = document.querySelectorAll('.magnetic');
        magnets.forEach(magnet => {
            magnet.addEventListener('mousemove', function(e) {
                const position = magnet.getBoundingClientRect();
                const x = e.clientX - position.left - position.width / 2;
                const y = e.clientY - position.top - position.height / 2;
                
                magnet.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            });

            magnet.addEventListener('mouseleave', function() {
                magnet.style.transform = 'translate(0px, 0px)';
                magnet.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            });
            
            magnet.addEventListener('mouseenter', function() {
                magnet.style.transition = 'none';
            });
        });
    }

    // ─── Application Logic ───
    const dropZone       = document.getElementById("drop-zone");
    const fileInput      = document.getElementById("file-input");
    const filePreview    = document.getElementById("file-preview");
    const fileName       = document.getElementById("file-name");
    const fileSize       = document.getElementById("file-size");
    const btnRemove      = document.getElementById("btn-remove");
    const btnUpload      = document.getElementById("btn-upload");
    const langSelection  = document.getElementById("language-selection");
    const targetLang     = document.getElementById("target-language");
    
    const uploadSection  = document.getElementById("upload-section");
    const progressSection= document.getElementById("progress-section");
    const progressBar    = document.getElementById("progress-bar");
    const progressTitle  = document.getElementById("progress-title");
    const progressStep   = document.getElementById("progress-step");
    
    const resultsSection = document.getElementById("results-section");
    const resultLanguage = document.getElementById("result-language");
    const resultSegments = document.getElementById("result-segments");
    const transcriptBox  = document.getElementById("transcript-content");
    const btnCopy        = document.getElementById("btn-copy");
    const btnDownloadTxt = document.getElementById("btn-download-txt");
    const btnDownloadSrt = document.getElementById("btn-download-srt");
    const btnNew         = document.getElementById("btn-new");
    
    const errorSection   = document.getElementById("error-section");
    const errorMessage   = document.getElementById("error-message");
    const btnRetry       = document.getElementById("btn-retry");

    let selectedFile = null;
    let pollInterval = null;

    function formatBytes(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }

    function smoothSwitchSection(oldSec, newSec) {
        if (typeof gsap !== 'undefined') {
            gsap.to(oldSec, {
                opacity: 0, scale: 0.95, duration: 0.4,
                onComplete: () => {
                    oldSec.style.display = "none";
                    newSec.style.display = "block";
                    gsap.fromTo(newSec, 
                        { opacity: 0, y: 30 }, 
                        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
                    );
                }
            });
        } else {
            oldSec.style.display = "none";
            newSec.style.display = "block";
        }
    }

    function showToast(message) {
        let toast = document.querySelector(".toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.className = "toast";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    function handleFile(file) {
        const allowed = ["mp4", "avi", "mov", "mkv", "webm", "flv", "wmv", "m4v"];
        const ext = file.name.split(".").pop().toLowerCase();

        if (!allowed.includes(ext)) {
            showToast("Unsupported format. Use MP4, AVI, MOV, MKV, or WebM.");
            return;
        }
        if (file.size > 500 * 1024 * 1024) {
            showToast("File too large. Maximum 500MB.");
            return;
        }

        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatBytes(file.size);
        
        // Hide dropzone, show preview & options
        dropZone.style.display = "none";
        
        if(typeof gsap !== 'undefined') {
            filePreview.style.display = "flex";
            langSelection.style.display = "block";
            btnUpload.style.display = "flex";
            gsap.fromTo([filePreview, langSelection, btnUpload], 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: "back.out(1.2)" }
            );
        } else {
            filePreview.style.display = "flex";
            langSelection.style.display = "block";
            btnUpload.style.display = "flex";
        }
    }

    function resetUpload() {
        selectedFile = null;
        fileInput.value = "";
        dropZone.style.display = "block";
        filePreview.style.display = "none";
        langSelection.style.display = "none";
        btnUpload.style.display = "none";
        gsap.to(dropZone, {opacity: 1, duration: 0.4});
    }

    // Drag & Drop
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    });
    btnRemove.addEventListener("click", resetUpload);

    // Upload
    btnUpload.addEventListener("click", async () => {
        if (!selectedFile) return;

        const btnContent = btnUpload.querySelector('.btn-content');
        if (btnContent) {
            btnUpload.style.pointerEvents = "none";
            btnUpload.style.opacity = "0.7";
            btnContent.innerHTML = `<span style="display: flex; align-items: center; gap: 8px;">
                <svg style="animation: spin 1s linear infinite;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                Uploading... 0%
            </span>`;
        }

        const formData = new FormData();
        formData.append("video", selectedFile);
        formData.append("target_language", targetLang.value);

        try {
            const jobId = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener("progress", (e) => {
                    if (e.lengthComputable) {
                        const pct = Math.round((e.loaded / e.total) * 100);
                        if (btnContent) {
                            btnContent.innerHTML = `<span style="display: flex; align-items: center; gap: 8px;">
                                <svg style="animation: spin 1s linear infinite;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                                Uploading... ${pct}%
                            </span>`;
                        }
                    }
                });
                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText).job_id);
                    } else {
                        reject(new Error(JSON.parse(xhr.responseText).error || "Upload failed"));
                    }
                });
                xhr.addEventListener("error", () => reject(new Error("Network error")));
                xhr.open("POST", "/upload");
                xhr.send(formData);
            });

            // Once uploaded, reset button and show progress section for AI processing
            if (btnContent) {
                btnContent.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 2L11 13"></path>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                    </svg>
                    Initialize Processing
                `;
                btnUpload.style.pointerEvents = "auto";
                btnUpload.style.opacity = "1";
            }

            smoothSwitchSection(uploadSection, progressSection);
            progressBar.style.width = "20%";
            progressTitle.textContent = "Analyzing Audio Stream...";
            progressStep.textContent = "Extracting characteristics & mapping text...";
            
            pollJobStatus(jobId);

        } catch (err) {
            if (btnContent) {
                btnContent.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 2L11 13"></path>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                    </svg>
                    Initialize Processing
                `;
                btnUpload.style.pointerEvents = "auto";
                btnUpload.style.opacity = "1";
            }
            smoothSwitchSection(uploadSection, errorSection);
            errorMessage.textContent = err.message;
        }
    });

    function pollJobStatus(jobId) {
        let progress = 60;
        pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/status/${jobId}`);
                const job = await res.json();
                
                if (job.step) progressStep.textContent = job.step;
                
                if (job.status === "processing") {
                    progress = Math.min(progress + 2, 90);
                    progressBar.style.width = progress + "%";
                }
                
                if (job.status === "completed") {
                    clearInterval(pollInterval);
                    progressBar.style.width = "100%";
                    setTimeout(() => showResults(job), 600);
                }
                
                if (job.status === "failed") {
                    clearInterval(pollInterval);
                    smoothSwitchSection(progressSection, errorSection);
                    errorMessage.textContent = job.error || "Execution halted logically.";
                }
            } catch (err) { console.warn(err); }
        }, 2000);
    }

    function showResults(job) {
        smoothSwitchSection(progressSection, resultsSection);
        const result = job.result;
        resultLanguage.textContent = (result.language || "EN").toUpperCase();
        resultSegments.textContent = `${result.segments} Data Segments`;
        transcriptBox.textContent = result.transcript || "No transcript data generated.";
        btnDownloadTxt.href = `/download/${result.files.txt}`;
        btnDownloadSrt.href = `/download/${result.files.srt}`;
    }

    btnCopy.addEventListener("click", () => {
        navigator.clipboard.writeText(transcriptBox.textContent).then(() => {
            showToast("Copied to clipboard!");
        }).catch(() => {
            const textarea = document.createElement("textarea");
            textarea.value = transcriptBox.textContent;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            showToast("Copied!");
        });
    });

    function goToUpload(fromSec) {
        if (pollInterval) clearInterval(pollInterval);
        resetUpload();
        smoothSwitchSection(fromSec, uploadSection);
    }

    btnNew.addEventListener("click", () => goToUpload(resultsSection));
    btnRetry.addEventListener("click", () => goToUpload(errorSection));

    // ─── Run Initializations ───
    document.addEventListener("DOMContentLoaded", () => {
        initThreeJS();
        initGSAP();
        initPrismaHero();
        initInteractions();
    });

})();
