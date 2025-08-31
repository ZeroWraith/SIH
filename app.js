document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();

    // App State
    const state = {
        currentUser: null, // { email, role: 'citizen' | 'admin', department: 'main' | 'sanitation' etc. }
        currentView: 'citizen-view',
        reports: [],
        users: [],
        isCameraOn: false
    };

    // DOM Elements
    const views = document.querySelectorAll('.view');
    const userNav = document.getElementById('user-nav');
    const homeLink = document.getElementById('home-link');
    const reportModal = document.getElementById('report-modal');

    // Mock Database Initialization
    function initializeDatabase() {
        if (!localStorage.getItem('samadhan_users')) {
            const defaultUsers = [
                { email: 'main-admin@samadhan.gov.in', password: 'password', role: 'admin', department: 'main', points: 0 },
                { email: 'sanitation-admin@samadhan.gov.in', password: 'password', role: 'admin', department: 'sanitation', points: 0 },
                { email: 'pothole-admin@samadhan.gov.in', password: 'password', role: 'admin', department: 'public_works', points: 0 },
                { email: 'citizen1@example.com', password: 'password', role: 'citizen', points: 150 },
                { email: 'citizen2@example.com', password: 'password', role: 'citizen', points: 120 },
                { email: 'citizen3@example.com', password: 'password', role: 'citizen', points: 95 },
            ];
            localStorage.setItem('samadhan_users', JSON.stringify(defaultUsers));
        }
        if (!localStorage.getItem('samadhan_reports')) {
             const defaultReports = [
                { id: 1, userId: 'citizen1@example.com', description: 'Overflowing garbage bin at City Park entrance.', category: 'sanitation', status: 'Resolved', isFake: false, timestamp: new Date(Date.now() - 5*24*60*60*1000).toISOString(), resolutionDate: new Date(Date.now() + 10*24*60*60*1000).toISOString(), image: 'https://placehold.co/400x300/CCCCCC/000000?text=Garbage', location: { lat: 28.4595, lng: 77.0266 }},
                { id: 2, userId: 'citizen2@example.com', description: 'Deep pothole on main street, very dangerous for two-wheelers.', category: 'public_works', status: 'In Progress', isFake: false, timestamp: new Date(Date.now() - 2*24*60*60*1000).toISOString(), resolutionDate: new Date(Date.now() + 13*24*60*60*1000).toISOString(), image: 'https://placehold.co/400x300/CCCCCC/000000?text=Pothole', location: { lat: 28.4600, lng: 77.0270 }},
                 { id: 3, userId: 'guest', guestName: 'Ravi Kumar', guestPhone: '9876543210', description: 'asdfghjkl this is a test report.', category: 'general', status: 'New', isFake: true, timestamp: new Date().toISOString(), resolutionDate: new Date(Date.now() + 15*24*60*60*1000).toISOString(), image: 'https://placehold.co/400x300/CCCCCC/000000?text=Fake%3F', location: { lat: 28.4610, lng: 77.0280 }},
            ];
            localStorage.setItem('samadhan_reports', JSON.stringify(defaultReports));
        }
        state.users = JSON.parse(localStorage.getItem('samadhan_users'));
        state.reports = JSON.parse(localStorage.getItem('samadhan_reports'));
    }

    // --- MOCKED AI ---
    function aiCategorize(description) {
        const desc = description.toLowerCase();
        if (/\b(garbage|waste|sewer|clean|dirty|trash)\b/.test(desc)) return 'sanitation';
        if (/\b(pothole|road|street|crack|pavement)\b/.test(desc)) return 'public_works';
        if (/\b(light|pole|electrical|wire|power)\b/.test(desc)) return 'electrical';
        return 'general';
    }

    function aiCheckFake(description) {
        // Very simple check: if description is too short or has no common words.
        if (description.length < 15 || !/[aeiou]/.test(description.toLowerCase())) {
            return true;
        }
        return false;
    }

    // --- UI & NAVIGATION ---
    function navigate(viewId) {
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        state.currentView = viewId;
        updateUI();
    }

    function updateUI() {
        // Update Navigation Bar
        userNav.innerHTML = '';
        if (state.currentUser) {
            const userEmail = document.createElement('span');
            userEmail.className = 'text-sm text-gray-600 hidden sm:block';
            userEmail.textContent = state.currentUser.email;
            userNav.appendChild(userEmail);

            if(state.currentUser.role === 'citizen') {
                const myReportsBtn = document.createElement('button');
                myReportsBtn.id = 'my-reports-btn';
                myReportsBtn.className = 'text-gray-600 hover:text-blue-600';
                myReportsBtn.textContent = 'My Reports';
                myReportsBtn.onclick = () => { document.getElementById('my-reports-container').classList.toggle('hidden'); renderMyReports(); };
                userNav.appendChild(myReportsBtn);
                document.getElementById('my-reports-container').classList.remove('hidden');
                renderMyReports();
            } else {
                 document.getElementById('my-reports-container').classList.add('hidden');
            }

            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.className = 'bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 text-sm';
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = handleLogout;
            userNav.appendChild(logoutBtn);
        } else {
            const loginBtn = document.createElement('button');
            loginBtn.id = 'login-btn';
            loginBtn.className = 'text-gray-600 hover:text-blue-600 font-semibold';
            loginBtn.textContent = 'Login / Register';
            loginBtn.onclick = () => navigate('login-view');
            userNav.appendChild(loginBtn);
             document.getElementById('my-reports-container').classList.add('hidden');
        }

        // Render content for active view
        if (state.currentView === 'admin-view') renderAdminDashboard();
        if (state.currentView === 'leaderboard-view') renderLeaderboard();
        if (state.currentView === 'citizen-view' && state.currentUser) renderMyReports();
    }

    function showToast(message, isSuccess = true) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        toastMessage.textContent = message;
        toast.className = `fixed bottom-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg opacity-0 transition-opacity duration-300 z-50 ${isSuccess ? 'bg-green-600' : 'bg-red-600'}`;
        toast.classList.remove('opacity-0');
        setTimeout(() => {
            toast.classList.add('opacity-0');
        }, 3000);
    }

    // --- RENDER FUNCTIONS ---
    function renderAdminDashboard() {
        const tbody = document.getElementById('admin-reports-tbody');
        const admin = state.currentUser;
        if (!admin) return;

        document.getElementById('admin-department-text').textContent = admin.department === 'main' 
            ? 'Viewing all reported civic issues.' 
            : `Viewing issues for the ${admin.department.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} department.`;

        const showFakeOnly = document.getElementById('filter-fake').checked;
        
        let reportsToDisplay = state.reports;
        if(admin.department !== 'main') {
            reportsToDisplay = state.reports.filter(r => r.category === admin.department);
        }
        if(showFakeOnly) {
             reportsToDisplay = reportsToDisplay.filter(r => r.isFake);
        }

        tbody.innerHTML = reportsToDisplay.length === 0 ? `<tr><td colspan="4" class="text-center py-8 text-gray-500">No reports found.</td></tr>` : '';

        reportsToDisplay.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(report => {
            const tr = document.createElement('tr');
            tr.className = report.isFake ? 'bg-yellow-50' : '';
            
            const reporter = report.userId === 'guest' ? `${report.guestName} (Guest)` : report.userId;
            const daysLeft = Math.round((new Date(report.resolutionDate) - new Date()) / (1000 * 60 * 60 * 24));
            const timelineText = daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`;
            const timelineColor = daysLeft > 5 ? 'text-green-600' : (daysLeft > 0 ? 'text-yellow-600' : 'text-red-600');

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <img src="${report.image}" alt="Issue Image" class="h-16 w-16 object-cover rounded-md cursor-pointer" onclick="window.open('${report.image}', '_blank')">
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-gray-900">${report.description}</div>
                    <div class="text-sm text-gray-500">By: ${reporter}</div>
                     <a href="https://maps.google.com/?q=${report.location.lat},${report.location.lng}" target="_blank" class="text-sm text-blue-500 hover:underline">View on Map</a>
                     ${report.isFake ? '<div class="text-xs font-bold text-yellow-600">FLAGGED: POTENTIALLY FAKE</div>' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(report.status)}">${report.status}</span>
                    <div class="text-sm text-gray-500 mt-1 font-semibold ${timelineColor}">${timelineText}</div>
                    ${report.extensionReason ? `<div class="text-xs text-gray-500 mt-1 italic">Extension: ${report.extensionReason}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <select class="status-change-select border-gray-300 rounded-md" data-id="${report.id}">
                        <option value="New" ${report.status === 'New' ? 'selected' : ''}>New</option>
                        <option value="In Progress" ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Resolved" ${report.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="Rejected" ${report.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                    <button class="extension-btn text-blue-600 hover:text-blue-900 ml-2" data-id="${report.id}" title="Request Extension"><i data-lucide="clock" class="h-5 w-5"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    }
    
    function renderMyReports() {
        const list = document.getElementById('my-reports-list');
        if(!state.currentUser || state.currentUser.role !== 'citizen') {
            list.innerHTML = '';
            return;
        }
        
        const myReports = state.reports.filter(r => r.userId === state.currentUser.email);
        list.innerHTML = myReports.length === 0 ? `<p class="text-center text-gray-500 p-4 bg-gray-50 rounded-lg">You haven't submitted any reports yet.</p>` : '';
        
        myReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(report => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row gap-4';
            
            const daysLeft = Math.round((new Date(report.resolutionDate) - new Date()) / (1000 * 60 * 60 * 24));
            const timelineText = daysLeft >= 0 ? `Est. Resolution: ${daysLeft} days` : `Overdue by ${Math.abs(daysLeft)} days`;
            const timelineColor = daysLeft > 5 ? 'text-green-600' : (daysLeft > 0 ? 'text-yellow-600' : 'text-red-600');

            card.innerHTML = `
                <img src="${report.image}" alt="Issue" class="w-full sm:w-32 h-32 object-cover rounded-md">
                <div class="flex-grow">
                    <div class="flex justify-between items-start">
                         <p class="text-gray-800 font-medium">${report.description}</p>
                         <span class="flex-shrink-0 ml-4 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(report.status)}">${report.status}</span>
                    </div>
                    <p class="text-sm text-gray-500 mt-1">Reported on: ${new Date(report.timestamp).toLocaleDateString()}</p>
                    <p class="text-sm font-semibold mt-1 ${timelineColor}">${timelineText}</p>
                     ${report.extensionReason ? `<p class="text-xs text-gray-500 mt-1 italic"><strong>Extension Reason:</strong> ${report.extensionReason}</p>` : ''}
                </div>
            `;
            list.appendChild(card);
        });
    }

    function renderLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        const sortedUsers = [...state.users]
            .filter(u => u.role === 'citizen')
            .sort((a, b) => b.points - a.points)
            .slice(0, 10);
        
        list.innerHTML = '';

        sortedUsers.forEach((user, index) => {
            const entry = document.createElement('div');
            const rank = index + 1;
            let bgColor = 'bg-white';
            if(rank === 1) bgColor = 'bg-yellow-100 border-yellow-300';
            if(rank === 2) bgColor = 'bg-gray-200 border-gray-300';
            if(rank === 3) bgColor = 'bg-orange-100 border-orange-300';
            
            entry.className = `p-3 rounded-lg flex items-center justify-between border ${bgColor}`;
            entry.innerHTML = `
                <div class="flex items-center gap-4">
                    <span class="font-bold text-lg text-gray-700 w-8 text-center">${rank}</span>
                    <span class="font-medium text-gray-800">${user.email}</span>
                </div>
                <div class="font-bold text-blue-600">${user.points} pts</div>
            `;
            list.appendChild(entry);
        });
    }
    
    function getStatusClass(status) {
        switch(status) {
            case 'New': return 'bg-blue-100 text-blue-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Resolved': return 'bg-green-100 text-green-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }
    
    // --- EVENT HANDLERS & LOGIC ---
    function handleLogout() {
        state.currentUser = null;
        navigate('citizen-view');
    }
    
    document.getElementById('auth-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const isRegistering = !document.getElementById('register-confirm-password-field').classList.contains('hidden');

        if (isRegistering) {
            const confirmPassword = document.getElementById('confirm-password').value;
            if(password !== confirmPassword) {
                showToast("Passwords do not match.", false);
                return;
            }
            if(state.users.find(u => u.email === email)) {
                showToast("User with this email already exists.", false);
                return;
            }
            const newUser = { email, password, role: 'citizen', points: 0 };
            state.users.push(newUser);
            localStorage.setItem('samadhan_users', JSON.stringify(state.users));
            state.currentUser = newUser;
            showToast("Registration successful!");
            navigate('citizen-view');
        } else { // Logging in
            const user = state.users.find(u => u.email === email && u.password === password);
            if (user) {
                state.currentUser = user;
                showToast("Login successful!");
                navigate(user.role === 'admin' ? 'admin-view' : 'citizen-view');
            } else {
                showToast("Invalid email or password.", false);
            }
        }
    });

    document.getElementById('admin-reports-list').addEventListener('change', function(e){
        if(e.target.classList.contains('status-change-select')) {
            const reportId = parseInt(e.target.dataset.id);
            const newStatus = e.target.value;
            const reportIndex = state.reports.findIndex(r => r.id === reportId);
            const userIndex = state.users.findIndex(u => u.email === state.reports[reportIndex].userId);

            const oldStatus = state.reports[reportIndex].status;

            if (newStatus === 'Resolved' && oldStatus !== 'Resolved' && userIndex !== -1) {
                state.users[userIndex].points += 10;
            } else if (oldStatus === 'Resolved' && newStatus !== 'Resolved' && userIndex !== -1) {
                state.users[userIndex].points -= 10;
            }
            
            if (newStatus === 'Rejected' && oldStatus !== 'Rejected' && userIndex !== -1) {
                 state.users[userIndex].points = Math.max(0, state.users[userIndex].points - 5);
            } else if (oldStatus === 'Rejected' && newStatus !== 'Rejected' && userIndex !== -1) {
                state.users[userIndex].points += 5;
            }


            state.reports[reportIndex].status = newStatus;
            localStorage.setItem('samadhan_reports', JSON.stringify(state.reports));
            localStorage.setItem('samadhan_users', JSON.stringify(state.users));
            showToast(`Report #${reportId} status updated to ${newStatus}.`);
            renderAdminDashboard();
        }
    });

    document.getElementById('admin-reports-list').addEventListener('click', function(e) {
        const extensionBtn = e.target.closest('.extension-btn');
        if (extensionBtn) {
            const reportId = extensionBtn.dataset.id;
            document.getElementById('extension-report-id').value = reportId;
            document.getElementById('admin-action-modal').classList.remove('hidden');
        }
    });

    document.getElementById('extension-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const reportId = parseInt(document.getElementById('extension-report-id').value);
        const reason = document.getElementById('extension-reason').value;
        const reportIndex = state.reports.findIndex(r => r.id === reportId);

        if(reportIndex > -1) {
            state.reports[reportIndex].extensionReason = reason;
            // Add 7 days to resolution timeline
            const currentResDate = new Date(state.reports[reportIndex].resolutionDate);
            state.reports[reportIndex].resolutionDate = new Date(currentResDate.setDate(currentResDate.getDate() + 7)).toISOString();
            
            localStorage.setItem('samadhan_reports', JSON.stringify(state.reports));
            showToast("Extension request submitted.");
            document.getElementById('admin-action-modal').classList.add('hidden');
            e.target.reset();
            renderAdminDashboard();
        }
    });
    
    // --- REPORT MODAL LOGIC (CAMERA & LOCATION) ---
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const capturedImage = document.getElementById('captured-image');
    const captureBtn = document.getElementById('capture-btn');
    const recaptureBtn = document.getElementById('recapture-btn');
    const locationStatus = document.getElementById('location-status');
    let currentCoordinates = null;
    let stream = null;

    async function startCamera() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                video.srcObject = stream;
                video.style.display = 'block';
                capturedImage.style.display = 'none';
                captureBtn.classList.remove('hidden');
                recaptureBtn.classList.add('hidden');
                state.isCameraOn = true;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access the camera. Please ensure you have given permission.");
        }
    }

    function stopCamera() {
         if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            state.isCameraOn = false;
        }
    }

    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentCoordinates = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    locationStatus.textContent = `GPS Location Acquired: ${currentCoordinates.lat.toFixed(4)}, ${currentCoordinates.lng.toFixed(4)}`;
                    locationStatus.classList.remove('text-red-500');
                    locationStatus.classList.add('text-green-600');
                },
                () => {
                    locationStatus.textContent = "Unable to retrieve location. Please enter address manually.";
                    locationStatus.classList.add('text-red-500');
                }
            );
        } else {
            locationStatus.textContent = "Geolocation is not supported by this browser.";
            locationStatus.classList.add('text-red-500');
        }
    }
    
    document.getElementById('report-issue-btn').addEventListener('click', () => {
         reportModal.classList.remove('hidden');
         document.getElementById('guest-fields').classList.toggle('hidden', !!state.currentUser);
         startCamera();
         getLocation();
    });

    document.getElementById('close-report-modal').addEventListener('click', () => {
         reportModal.classList.add('hidden');
         stopCamera();
    });

    captureBtn.addEventListener('click', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedImage.src = canvas.toDataURL('image/jpeg');
        
        video.style.display = 'none';
        capturedImage.style.display = 'block';
        captureBtn.classList.add('hidden');
        recaptureBtn.classList.remove('hidden');
        stopCamera();
    });
    
    recaptureBtn.addEventListener('click', startCamera);

    document.getElementById('report-form').addEventListener('submit', function(e){
        e.preventDefault();
        const description = document.getElementById('description').value;
        const image = capturedImage.src;
        const location = currentCoordinates || document.getElementById('manual-address').value;
        
        if (!image.startsWith('data:image')) {
            showToast("Please capture a photo of the issue.", false);
            return;
        }
        if (!location) {
             showToast("Please provide a location (either via GPS or manually).", false);
            return;
        }
        
        const newReport = {
            id: Date.now(),
            userId: state.currentUser ? state.currentUser.email : 'guest',
            description,
            image,
            location: typeof location === 'string' ? { address: location } : location,
            timestamp: new Date().toISOString(),
            resolutionDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'New',
            category: aiCategorize(description),
            isFake: aiCheckFake(description)
        };
        
        if(!state.currentUser) {
            newReport.guestName = document.getElementById('guest-name').value;
            newReport.guestPhone = document.getElementById('guest-phone').value;
        }

        state.reports.push(newReport);
        localStorage.setItem('samadhan_reports', JSON.stringify(state.reports));
        
        showToast("Report submitted successfully!");
        reportModal.classList.add('hidden');
        e.target.reset();
        capturedImage.src = '';
        stopCamera();
        if(state.currentUser) renderMyReports();
    });

    // --- AUTH FORM TOGGLING ---
    const loginTitle = document.getElementById('login-title');
    const authToggleText = document.getElementById('auth-toggle-text');
    const registerConfirmPasswordField = document.getElementById('register-confirm-password-field');
    const authSubmitBtn = document.getElementById('auth-submit-btn');

    document.getElementById('show-register-link').addEventListener('click', (e) => {
        e.preventDefault();
        loginTitle.textContent = 'Citizen Registration';
        registerConfirmPasswordField.classList.remove('hidden');
        authSubmitBtn.textContent = 'Register';
        authToggleText.innerHTML = `Already have an account? <a href=\"#\" id=\"show-login-link\" class=\"font-medium text-blue-600 hover:text-blue-500\">Login here</a>.`;
    });

    document.getElementById('show-admin-login-link').addEventListener('click', (e) => {
        e.preventDefault();
        loginTitle.textContent = 'Admin Login';
        registerConfirmPasswordField.classList.add('hidden');
        authSubmitBtn.textContent = 'Login';
        authToggleText.innerHTML = `Not an admin? <a href=\"#\" id=\"show-login-link\" class=\"font-medium text-blue-600 hover:text-blue-500\">Login as Citizen</a>.`;
    });

    authToggleText.addEventListener('click', (e) => {
        if(e.target.id === 'show-login-link') {
            e.preventDefault();
            loginTitle.textContent = 'Citizen Login';
            registerConfirmPasswordField.classList.add('hidden');
            authSubmitBtn.textContent = 'Login';
            authToggleText.innerHTML = `Don't have an account? <a href=\"#\" id=\"show-register-link\" class=\"font-medium text-blue-600 hover:text-blue-500\">Register here</a>.<br>Are you an admin? <a href=\"#\" id=\"show-admin-login-link\" class=\"font-medium text-blue-600 hover:text-blue-500\">Login as Admin</a>.`;
        }
    });

    // --- Other event listeners ---
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(state.currentUser?.role === 'admin' ? 'admin-view' : 'citizen-view');
    });
    document.getElementById('view-leaderboard-btn-citizen').addEventListener('click', () => navigate('leaderboard-view'));
    document.getElementById('close-admin-modal').addEventListener('click', () => document.getElementById('admin-action-modal').classList.add('hidden'));
    document.getElementById('cancel-extension').addEventListener('click', () => document.getElementById('admin-action-modal').classList.add('hidden'));
    document.getElementById('filter-fake').addEventListener('change', renderAdminDashboard);

    // --- App Initialization ---
    initializeDatabase();
    updateUI();
});
