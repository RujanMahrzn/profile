document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const preMeetingScreen = document.getElementById('preMeetingScreen');
    const meetingScreen = document.getElementById('meetingScreen');
    const settingsPanel = document.getElementById('settingsPanel');
    const sidebar = document.getElementById('sidebar');
    const participantsTab = document.getElementById('participantsTab');
    const chatTab = document.getElementById('chatTab');
    const participantsList = document.getElementById('participantsList');
    const chatMessages = document.getElementById('chatMessages');
    const mainVideo = document.getElementById('mainVideo');
    const mainVideoContainer = document.getElementById('mainVideoContainer');
    
    // Buttons
    const newMeetingBtn = document.getElementById('newMeetingBtn');
    const joinMeetingBtn = document.getElementById('joinMeetingBtn');
    const settingsToggle = document.querySelector('.settings-toggle');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const toggleMicBtn = document.getElementById('toggleMicBtn');
    const toggleVideoBtn = document.getElementById('toggleVideoBtn');
    const shareScreenBtn = document.getElementById('shareScreenBtn');
    const endCallBtn = document.getElementById('endCallBtn');
    const inviteParticipantsBtn = document.getElementById('inviteParticipantsBtn');
    const participantsBtn = document.getElementById('participantsBtn');
    const chatBtn = document.getElementById('chatBtn');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatMessageInput = document.getElementById('chatMessageInput');
    const copyInviteLinkBtn = document.getElementById('copyInviteLinkBtn');
    const shareViaEmailBtn = document.getElementById('shareViaEmailBtn');
    
    // Modals
    const inviteModal = document.getElementById('inviteModal');
    const closeInviteModalBtn = document.getElementById('closeInviteModalBtn');
    const copyMeetingLinkBtn = document.getElementById('copyMeetingLinkBtn');
    const meetingLinkInput = document.getElementById('meetingLinkInput');
    
    // State variables
    let localStream;
    let screenStream;
    let meetingId = generateMeetingId();
    let meetingStartTime;
    let timerInterval;
    let isMicOn = true;
    let isVideoOn = true;
    let isScreenSharing = false;
    let participants = [];
    let chatMessagesData = [];
    
    // Initialize the app
    init();
    
    function init() {
        setupEventListeners();
        setupDeviceSelectors();
        updateMeetingIdDisplay();
    }
    
    function setupEventListeners() {
        // Pre-meeting screen
        newMeetingBtn.addEventListener('click', startNewMeeting);
        joinMeetingBtn.addEventListener('click', joinMeeting);
        settingsToggle.addEventListener('click', toggleSettingsPanel);
        closeSettingsBtn.addEventListener('click', toggleSettingsPanel);
        
        // Meeting screen
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
        closeSidebarBtn.addEventListener('click', toggleSidebar);
        toggleMicBtn.addEventListener('click', toggleMic);
        toggleVideoBtn.addEventListener('click', toggleVideo);
        shareScreenBtn.addEventListener('click', toggleScreenShare);
        endCallBtn.addEventListener('click', endMeeting);
        inviteParticipantsBtn.addEventListener('click', showInviteModal);
        participantsBtn.addEventListener('click', showParticipantsTab);
        chatBtn.addEventListener('click', showChatTab);
        sendMessageBtn.addEventListener('click', sendMessage);
        chatMessageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Sidebar tabs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
        
        // Invite modal
        copyInviteLinkBtn.addEventListener('click', copyInviteLink);
        shareViaEmailBtn.addEventListener('click', showInviteModal);
        closeInviteModalBtn.addEventListener('click', hideInviteModal);
        copyMeetingLinkBtn.addEventListener('click', copyMeetingLink);
    }
    
    function setupDeviceSelectors() {
        // In a real app, you would enumerate devices here
        // This is a simplified version
        const cameras = [
            { deviceId: 'default', label: 'Default Camera' },
            { deviceId: 'front', label: 'Front Camera' },
            { deviceId: 'back', label: 'Back Camera' }
        ];
        
        const mics = [
            { deviceId: 'default', label: 'Default Microphone' },
            { deviceId: 'external', label: 'External Microphone' }
        ];
        
        const speakers = [
            { deviceId: 'default', label: 'Default Speaker' },
            { deviceId: 'external', label: 'External Speaker' }
        ];
        
        populateSelect('cameraSelect', cameras);
        populateSelect('micSelect', mics);
        populateSelect('speakerSelect', speakers);
    }
    
    function populateSelect(selectId, devices) {
        const select = document.getElementById(selectId);
        select.innerHTML = '';
        
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label;
            select.appendChild(option);
        });
    }
    
    function generateMeetingId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    function updateMeetingIdDisplay() {
        document.getElementById('meetingIdDisplay').textContent = `Meeting ID: ${meetingId}`;
        meetingLinkInput.value = `${window.location.origin}?meeting=${meetingId}`;
    }
    
    async function startNewMeeting() {
        try {
            // Get user media
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            
            // Start the meeting
            startMeeting();
            
            // Add local participant
            addParticipant('You', true, true, true);
            
            // Simulate remote participants joining
            setTimeout(() => {
                addParticipant('John Doe', true, true, false);
                addParticipant('Jane Smith', true, false, false);
                addParticipant('Mike Johnson', false, true, false);
            }, 2000);
            
        } catch (error) {
            console.error('Error accessing media devices:', error);
            alert('Could not access your camera or microphone. Please check your permissions.');
        }
    }
    
    function joinMeeting() {
        const meetingIdInput = document.getElementById('meetingId');
        const id = meetingIdInput.value.trim();
        
        if (!id) {
            alert('Please enter a meeting ID');
            return;
        }
        
        meetingId = id;
        startNewMeeting();
    }
    
    function startMeeting() {
        // Show meeting screen
        preMeetingScreen.style.display = 'none';
        meetingScreen.style.display = 'flex';
        
        // Start the meeting timer
        meetingStartTime = new Date();
        updateMeetingTimer();
        timerInterval = setInterval(updateMeetingTimer, 1000);
        
        // Display local video
        mainVideo.srcObject = localStream;
        
        // Update UI
        updateParticipantCount();
    }
    
    function updateMeetingTimer() {
        const now = new Date();
        const diff = now - meetingStartTime;
        
        const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        
        document.getElementById('meetingTime').textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    function toggleSettingsPanel() {
        settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
    }
    
    function toggleSidebar() {
        sidebar.classList.toggle('open');
    }
    
    function toggleMic() {
        isMicOn = !isMicOn;
        
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMicOn;
            });
        }
        
        toggleMicBtn.innerHTML = isMicOn ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
        toggleMicBtn.title = isMicOn ? 'Mute' : 'Unmute';
        
        // Update participant status
        updateLocalParticipant();
    }
    
    function toggleVideo() {
        isVideoOn = !isVideoOn;
        
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = isVideoOn;
            });
        }
        
        toggleVideoBtn.innerHTML = isVideoOn ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
        toggleVideoBtn.title = isVideoOn ? 'Stop Video' : 'Start Video';
        
        // Update participant status
        updateLocalParticipant();
    }
    
    async function toggleScreenShare() {
        try {
            if (!isScreenSharing) {
                // Start screen sharing
                screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });
                
                // Replace the video track in the main video
                const videoTrack = screenStream.getVideoTracks()[0];
                mainVideo.srcObject = new MediaStream([videoTrack]);
                
                isScreenSharing = true;
                shareScreenBtn.innerHTML = '<i class="fas fa-stop"></i><span>Stop Sharing</span>';
                shareScreenBtn.classList.add('active');
                
                // Listen for when the user stops screen sharing
                videoTrack.onended = () => {
                    toggleScreenShare();
                };
            } else {
                // Stop screen sharing
                screenStream.getTracks().forEach(track => track.stop());
                mainVideo.srcObject = localStream;
                
                isScreenSharing = false;
                shareScreenBtn.innerHTML = '<i class="fas fa-desktop"></i><span>Share Screen</span>';
                shareScreenBtn.classList.remove('active');
            }
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    }
    
    function endMeeting() {
        if (confirm('Are you sure you want to end the meeting for everyone?')) {
            // Stop all media streams
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
            }
            
            // Clear timer
            clearInterval(timerInterval);
            
            // Reset UI
            preMeetingScreen.style.display = 'flex';
            meetingScreen.style.display = 'none';
            sidebar.classList.remove('open');
            
            // Reset state
            participants = [];
            chatMessagesData = [];
            isMicOn = true;
            isVideoOn = true;
            isScreenSharing = false;
            
            // Clear participants list
            participantsList.innerHTML = '';
            
            // Clear chat messages
            chatMessages.innerHTML = '';
            
            // Reset buttons
            toggleMicBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
            shareScreenBtn.innerHTML = '<i class="fas fa-desktop"></i><span>Share Screen</span>';
            shareScreenBtn.classList.remove('active');
        }
    }
    
    function addParticipant(name, isVideoOn, isMicOn, isLocal) {
        const participant = {
            id: Date.now().toString(),
            name,
            isVideoOn,
            isMicOn,
            isLocal,
            isSpeaking: false
        };
        
        participants.push(participant);
        renderParticipant(participant);
        updateParticipantCount();
    }
    
    function renderParticipant(participant) {
        const participantElement = document.createElement('div');
        participantElement.className = 'participant-item';
        participantElement.dataset.id = participant.id;
        
        const initials = participant.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        participantElement.innerHTML = `
            <div class="participant-avatar" style="background-color: ${getRandomColor()}">
                ${initials}
            </div>
            <div class="participant-name">${participant.name} ${participant.isLocal ? '(You)' : ''}</div>
            <div class="participant-status">
                ${participant.isMicOn ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>'}
                ${participant.isVideoOn ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>'}
            </div>
        `;
        
        participantsList.appendChild(participantElement);
    }
    
    function updateLocalParticipant() {
        const localParticipant = participants.find(p => p.isLocal);
        if (localParticipant) {
            localParticipant.isMicOn = isMicOn;
            localParticipant.isVideoOn = isVideoOn;
            
            const participantElement = document.querySelector(`.participant-item[data-id="${localParticipant.id}"]`);
            if (participantElement) {
                const statusElement = participantElement.querySelector('.participant-status');
                statusElement.innerHTML = `
                    ${isMicOn ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>'}
                    ${isVideoOn ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>'}
                `;
            }
        }
    }
    
    function updateParticipantCount() {
        document.getElementById('participantCount').textContent = participants.length;
    }
    
    function getRandomColor() {
        const colors = ['#4285f4', '#34a853', '#fbbc05', '#ea4335', '#673ab7', '#9c27b0', '#3f51b5'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    function showInviteModal() {
        inviteModal.style.display = 'flex';
    }
    
    function hideInviteModal() {
        inviteModal.style.display = 'none';
    }
    
    function copyInviteLink() {
        navigator.clipboard.writeText(meetingLinkInput.value)
            .then(() => alert('Meeting link copied to clipboard!'))
            .catch(err => console.error('Could not copy text: ', err));
    }
    
    function copyMeetingLink() {
        copyInviteLink();
        hideInviteModal();
    }
    
    function showParticipantsTab() {
        switchTab('participants');
        if (!sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    }
    
    function showChatTab() {
        switchTab('chat');
        if (!sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    }
    
    function switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Tab`);
        });
    }
    
    function sendMessage() {
        const message = chatMessageInput.value.trim();
        if (!message) return;
        
        const newMessage = {
            id: Date.now(),
            sender: 'You',
            content: message,
            time: new Date()
        };
        
        chatMessagesData.push(newMessage);
        renderMessage(newMessage);
        
        // Clear input
        chatMessageInput.value = '';
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Simulate response
        setTimeout(() => {
            const responses = [
                "Thanks for the update!",
                "I agree with that.",
                "Can you explain that further?",
                "Let's discuss this later.",
                "Great point!"
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            const responseMessage = {
                id: Date.now(),
                sender: participants[1]?.name || 'Participant',
                content: randomResponse,
                time: new Date()
            };
            
            chatMessagesData.push(responseMessage);
            renderMessage(responseMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);
    }
    
    function renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        const timeString = message.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-sender">${message.sender}</div>
            <div class="message-content">${message.content}</div>
            <div class="message-time">${timeString}</div>
        `;
        
        chatMessages.appendChild(messageElement);
    }
    
    // Simulate incoming chat messages
    setInterval(() => {
        if (participants.length > 1 && Math.random() > 0.7) {
            const randomMessages = [
                "Can everyone hear me okay?",
                "I think we should move on to the next topic.",
                "Does anyone have any questions?",
                "I'll share my screen to show what I mean.",
                "Let me know if you need me to repeat that."
            ];
            
            const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];
            
            const newMessage = {
                id: Date.now(),
                sender: participants[1].name,
                content: randomMessage,
                time: new Date()
            };
            
            chatMessagesData.push(newMessage);
            renderMessage(newMessage);
            
            // If chat tab is not active, show notification
            if (!document.querySelector('.sidebar-tab[data-tab="chat"]').classList.contains('active')) {
                document.querySelector('.sidebar-tab[data-tab="chat"]').classList.add('has-notification');
            }
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }, 10000);
});
