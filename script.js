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
    
    // WebRTC variables
    let peerConnections = {};
    let dataChannels = {};
    let signalingSocket;
    let localParticipantId = generateId();
    let currentRoomId = '';
    let localUserName = 'You';
    
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
                this.classList.remove('has-notification');
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
    
    function generateId() {
        return Math.random().toString(36).substring(2, 15);
    }
    
    function updateMeetingIdDisplay() {
        document.getElementById('meetingIdDisplay').textContent = `Meeting ID: ${meetingId}`;
        meetingLinkInput.value = `${window.location.origin}?meeting=${meetingId}`;
    }
    
    async function startNewMeeting() {
        try {
            // Connect to signaling server
            signalingSocket = new WebSocket('wss://your-signaling-server.com');
            setupSignalingSocket();
            
            // Get user media
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            
            currentRoomId = meetingId || generateMeetingId();
            
            // Join the room
            signalingSocket.send(JSON.stringify({
                type: 'join',
                roomId: currentRoomId,
                participantId: localParticipantId,
                name: localUserName
            }));
            
            // Start the meeting UI
            startMeeting();
            
            // Add local participant
            addParticipant(localUserName, true, true, true, localParticipantId);
            
        } catch (error) {
            console.error('Error starting meeting:', error);
            alert('Could not start the meeting. Please check your camera/microphone permissions.');
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
    
    function setupSignalingSocket() {
        signalingSocket.onopen = () => {
            console.log('Connected to signaling server');
        };
        
        signalingSocket.onclose = () => {
            console.log('Disconnected from signaling server');
            alert('Connection lost. Trying to reconnect...');
            setTimeout(() => {
                setupSignalingSocket();
            }, 3000);
        };
        
        signalingSocket.onerror = (error) => {
            console.error('Signaling error:', error);
        };
        
        signalingSocket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'participants':
                    handleExistingParticipants(message.participants);
                    break;
                case 'join':
                    handleNewParticipant(message);
                    break;
                case 'leave':
                    handleParticipantLeft(message.participantId);
                    break;
                case 'offer':
                    await handleOffer(message);
                    break;
                case 'answer':
                    await handleAnswer(message);
                    break;
                case 'candidate':
                    await handleCandidate(message);
                    break;
                case 'chat':
                    handleRemoteChat(message);
                    break;
            }
        };
    }
    
    async function handleExistingParticipants(existingParticipants) {
        // Create peer connections for existing participants
        for (const participant of existingParticipants) {
            await createPeerConnection(participant.id);
            
            // Send offer to the existing participant
            const peerConnection = peerConnections[participant.id];
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);
            
            signalingSocket.send(JSON.stringify({
                type: 'offer',
                roomId: currentRoomId,
                targetParticipantId: participant.id,
                offer: offer,
                senderId: localParticipantId,
                senderName: localUserName
            }));
            
            // Add to participants list
            addParticipant(participant.name, true, true, false, participant.id);
        }
    }
    
    async function handleNewParticipant(message) {
        const { participantId, name } = message;
        
        // Add to participants list
        addParticipant(name, true, true, false, participantId);
        
        // Create peer connection
        await createPeerConnection(participantId);
        
        // Send offer
        const peerConnection = peerConnections[participantId];
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        
        signalingSocket.send(JSON.stringify({
            type: 'offer',
            roomId: currentRoomId,
            targetParticipantId: participantId,
            offer: offer,
            senderId: localParticipantId,
            senderName: localUserName
        }));
    }
    
    async function createPeerConnection(participantId) {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                // Add your TURN server credentials here for production
                // {
                //     urls: 'turn:your.turn.server:3478',
                //     username: 'username',
                //     credential: 'password'
                // }
            ]
        };
        
        const peerConnection = new RTCPeerConnection(configuration);
        peerConnections[participantId] = peerConnection;
        
        // Add local stream to connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
        
        // Set up data channel for chat
        if (participantId > localParticipantId) { // Only one peer creates the channel
            const channel = peerConnection.createDataChannel('chat', {
                ordered: true,
                maxPacketLifeTime: 3000
            });
            setupDataChannel(participantId, channel);
        }
        
        peerConnection.ondatachannel = (event) => {
            if (event.channel.label === 'chat') {
                setupDataChannel(participantId, event.channel);
            }
        };
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalingSocket.send(JSON.stringify({
                    type: 'candidate',
                    roomId: currentRoomId,
                    targetParticipantId: participantId,
                    candidate: event.candidate,
                    senderId: localParticipantId
                }));
            }
        };
        
        peerConnection.ontrack = (event) => {
            // Handle remote streams (simplified - in real app you'd display these)
            console.log('Received remote track from', participantId, event.streams[0]);
            
            // Update participant's video status
            const participant = participants.find(p => p.id === participantId);
            if (participant) {
                participant.isVideoOn = true;
                updateParticipantUI(participantId);
            }
        };
        
        peerConnection.oniceconnectionstatechange = () => {
            console.log(`ICE connection state with ${participantId}:`, peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'disconnected' || 
                peerConnection.iceConnectionState === 'failed') {
                // Attempt to reconnect
                setTimeout(() => {
                    if (peerConnection.iceConnectionState !== 'connected') {
                        restartIce(peerConnection);
                    }
                }, 2000);
            }
        };
        
        return peerConnection;
    }
    
    function setupDataChannel(participantId, channel) {
        dataChannels[participantId] = channel;
        
        channel.onopen = () => {
            console.log('Data channel opened with', participantId);
        };
        
        channel.onclose = () => {
            console.log('Data channel closed with', participantId);
            delete dataChannels[participantId];
        };
        
        channel.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'chat') {
                handleRemoteChat(message);
            }
        };
    }
    
    async function handleOffer(message) {
        const { offer, senderId, senderName } = message;
        await createPeerConnection(senderId);
        
        const peerConnection = peerConnections[senderId];
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        signalingSocket.send(JSON.stringify({
            type: 'answer',
            roomId: currentRoomId,
            targetParticipantId: senderId,
            answer: answer,
            senderId: localParticipantId
        }));
    }
    
    async function handleAnswer(message) {
        const { answer, senderId } = message;
        const peerConnection = peerConnections[senderId];
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }
    
    async function handleCandidate(message) {
        const { candidate, senderId } = message;
        const peerConnection = peerConnections[senderId];
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Error adding ICE candidate:', e);
            }
        }
    }
    
    function handleParticipantLeft(participantId) {
        // Close peer connection
        if (peerConnections[participantId]) {
            peerConnections[participantId].close();
            delete peerConnections[participantId];
        }
        
        // Remove data channel
        if (dataChannels[participantId]) {
            delete dataChannels[participantId];
        }
        
        // Remove from UI
        const participantElement = document.querySelector(`.participant-item[data-id="${participantId}"]`);
        if (participantElement) {
            participantElement.remove();
        }
        
        // Update participants list
        participants = participants.filter(p => p.id !== participantId);
        updateParticipantCount();
    }
    
    function restartIce(peerConnection) {
        if (peerConnection) {
            peerConnection.restartIce();
        }
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
        if (localStream) {
            mainVideo.srcObject = localStream;
        }
        
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
                
                // Replace the video track in all peer connections
                const videoTrack = screenStream.getVideoTracks()[0];
                
                // Update local display
                mainVideo.srcObject = new MediaStream([videoTrack]);
                
                // Replace tracks in all peer connections
                Object.values(peerConnections).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });
                
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
                
                // Restore local video
                const videoTrack = localStream.getVideoTracks()[0];
                mainVideo.srcObject = new MediaStream([
                    videoTrack,
                    ...localStream.getAudioTracks()
                ]);
                
                // Restore tracks in all peer connections
                Object.values(peerConnections).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender && videoTrack) {
                        sender.replaceTrack(videoTrack);
                    }
                });
                
                isScreenSharing = false;
                shareScreenBtn.innerHTML = '<i class="fas fa-desktop"></i><span>Share Screen</span>';
                shareScreenBtn.classList.remove('active');
            }
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    }
    
    function endMeeting() {
        if (confirm('Are you sure you want to end the meeting?')) {
            // Close all peer connections
            Object.values(peerConnections).forEach(pc => pc.close());
            peerConnections = {};
            dataChannels = {};
            
            // Close signaling connection
            if (signalingSocket) {
                signalingSocket.close();
            }
            
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
            localParticipantId = generateId();
            currentRoomId = '';
            
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
    
    function addParticipant(name, isVideoOn, isMicOn, isLocal, id = localParticipantId) {
        const participant = {
            id,
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
        const localParticipant = participants.find(p => p.id === localParticipantId);
        if (localParticipant) {
            localParticipant.isMicOn = isMicOn;
            localParticipant.isVideoOn = isVideoOn;
            updateParticipantUI(localParticipantId);
        }
    }
    
    function updateParticipantUI(participantId) {
        const participant = participants.find(p => p.id === participantId);
        if (!participant) return;
        
        const participantElement = document.querySelector(`.participant-item[data-id="${participantId}"]`);
        if (participantElement) {
            const statusElement = participantElement.querySelector('.participant-status');
            if (statusElement) {
                statusElement.innerHTML = `
                    ${participant.isMicOn ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>'}
                    ${participant.isVideoOn ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>'}
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
            type: 'chat',
            senderId: localParticipantId,
            senderName: localUserName,
            content: message,
            timestamp: Date.now()
        };
        
        // Send via signaling server (fallback)
        signalingSocket.send(JSON.stringify({
            type: 'chat',
            roomId: currentRoomId,
            ...newMessage
        }));
        
        // Also try to send via data channels
        Object.entries(dataChannels).forEach(([id, channel]) => {
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify(newMessage));
            }
        });
        
        // Render locally
        renderMessage({
            id: newMessage.timestamp,
            sender: 'You',
            content: message,
            time: new Date()
        });
        
        chatMessageInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function handleRemoteChat(message) {
        renderMessage({
            id: message.timestamp,
            sender: message.senderName,
            content: message.content,
            time: new Date(message.timestamp)
        });
        
        // Show notification if chat tab isn't active
        if (!document.querySelector('.sidebar-tab[data-tab="chat"]').classList.contains('active')) {
            document.querySelector('.sidebar-tab[data-tab="chat"]').classList.add('has-notification');
        }
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
});
