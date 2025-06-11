document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const sidebar = document.querySelector('.sidebar');
    const themeSwitchButton = document.getElementById('theme-switch');
    const langSwitchButton = document.getElementById('lang-switch');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatArea = document.querySelector('.chat-area');
    const disclaimer = document.querySelector('.disclaimer');
    const newChatButton = document.querySelector('.new-chat-button');
    const chatList = document.querySelector('.chat-list');
    const currentChatTitle = document.getElementById('current-chat-title');
    const sidebarToggleMobileButton = document.getElementById('sidebar-toggle-mobile');

    // --- API Configuration ---
    // URL وب‌هوک n8n خود را اینجا قرار دهید
    const API_URL = 'https://cofe-code.com/webhook/park'; // URL نمونه

    let messageIndex = 0; // برای انیمیشن پیام‌ها
    let typingIndicatorElement = null;
    let currentLang = localStorage.getItem('appLang') || 'fa';
    let currentChatId = 'general'; // شناسه چت فعال

    // --- Theme Switching ---
    function applyTheme(theme) {
        body.className = theme;
        localStorage.setItem('appTheme', theme);
        const icon = themeSwitchButton.querySelector('.icon i');
        if (theme === 'dark-mode') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    themeSwitchButton.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-mode') ? 'light-mode' : 'dark-mode';
        applyTheme(newTheme);
    });

    // --- Language Switching ---
    function applyLanguage(lang) {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
        currentLang = lang;
        localStorage.setItem('appLang', lang);

        // به‌روزرسانی متن‌های ثابت بر اساس زبان
        document.querySelectorAll('[data-fa]').forEach(el => {
            const key = el.dataset.key || (el.id ? el.id.replace(/-/g, '_') : '');
            if (lang === 'fa') {
                el.textContent = el.dataset.fa;
                if (el.placeholder) el.placeholder = el.dataset.faPlaceholder || el.dataset.fa;
            } else {
                el.textContent = el.dataset.en;
                if (el.placeholder) el.placeholder = el.dataset.enPlaceholder || el.dataset.en;
            }
        });

        // به‌روزرسانی متن دکمه تغییر زبان
        const langSwitchText = langSwitchButton.querySelector('.text');
        const langSwitchIcon = langSwitchButton.querySelector('.icon i');
        if (lang === 'fa') {
            langSwitchText.textContent = 'English';
            langSwitchButton.dataset.lang = 'en';
        } else {
            langSwitchText.textContent = 'فارسی';
            langSwitchButton.dataset.lang = 'fa';
        }
        // به‌روزرسانی placeholder ها
        chatInput.placeholder = lang === 'fa' ? "پیام خود را اینجا بنویسید..." : "Type your message here...";
        disclaimer.textContent = lang === 'fa' ? "چت‌بات ممکن است اشتباه کند. لطفاً اطلاعات مهم را بررسی کنید." : "AI may make mistakes. Please verify important information.";
        newChatButton.querySelector('.text').textContent = lang === 'fa' ? "گفتگوی جدید" : "New Chat";
        themeSwitchButton.querySelector('.text').textContent = lang === 'fa' ? "تغییر پوسته" : "Switch Theme";
        document.getElementById('settings-button').querySelector('.text').textContent = lang === 'fa' ? "تنظیمات" : "Settings";

        // به‌روزرسانی آواتارها و متن‌های داینامیک دیگر
        updateDynamicTexts();
    }

    langSwitchButton.addEventListener('click', () => {
        const nextLang = langSwitchButton.dataset.lang;
        applyLanguage(nextLang);
    });

    function updateDynamicTexts() {
        // به‌روزرسانی آواتار پیام‌های موجود
        chatArea.querySelectorAll('.message-avatar').forEach(avatar => {
            if (avatar.closest('.user-message')) {
                // آواتار کاربر نیازی به تغییر متن ندارد، فقط آیکون
            } else if (avatar.closest('.ai-message')) {
                // آواتار AI نیازی به تغییر متن ندارد، فقط آیکون
            } else if (avatar.closest('.error-message')) {
                avatar.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            }
        });
        // به‌روزرسانی عنوان چت فعلی اگر از دیتاست‌ها استفاده می‌کند
        const activeChatItem = chatList.querySelector('.chat-item.active');
        if (activeChatItem) {
            currentChatTitle.textContent = activeChatItem.querySelector('.chat-title').textContent;
        }
    }


    // --- Sending Messages & AI Response ---
    async function sendMessage() {
        const messageText = chatInput.value.trim();
        if (messageText === '') return;

        displayMessage(messageText, 'user');
        chatInput.value = '';
        adjustTextareaHeight();
        chatInput.focus();

        // غیرفعال کردن موقت ورودی
        chatInput.disabled = true;
        sendButton.disabled = true;
        sendButton.style.opacity = '0.7';

        typingIndicatorElement = displayTypingIndicator();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ prompt: messageText, chatId: currentChatId, lang: currentLang }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorData.substring(0, 100)}`);
            }

            const data = await response.json();
            const aiResponseText = data.response || (currentLang === 'fa' ? "پاسخی دریافت نشد." : "No response received.");

            if (typingIndicatorElement) {
                typingIndicatorElement.remove();
                typingIndicatorElement = null;
            }
            displayMessage(aiResponseText, 'ai');

        } catch (error) {
            console.error('Error sending message or fetching AI response:', error);
            if (typingIndicatorElement) {
                typingIndicatorElement.remove();
                typingIndicatorElement = null;
            }
            const errorMsg = currentLang === 'fa' ? `خطا در ارتباط: ${error.message}` : `Connection error: ${error.message}`;
            displayMessage(errorMsg, 'error');
        } finally {
            chatInput.disabled = false;
            sendButton.disabled = false;
            sendButton.style.opacity = '1';
        }
    }

    function displayMessage(text, sender) {
        messageIndex++; // برای انیمیشن‌های آبشاری
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.style.setProperty('--message-index', messageIndex);

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('message-avatar');
        if (sender === 'user') {
            avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
        } else if (sender === 'ai') {
            avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
        } else { // error
            avatarDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        }

        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');
        // برای امنیت، متن را به عنوان textContent تنظیم کنید، مگر اینکه HTML لازم باشد
        // در اینجا برای سادگی از textContent استفاده می‌کنیم
        const p = document.createElement('p');
        p.textContent = text;
        bubbleDiv.appendChild(p);

        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = new Date().toLocaleTimeString(currentLang === 'fa' ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        bubbleDiv.appendChild(timeSpan);

        if (document.documentElement.dir === 'rtl') {
            messageDiv.appendChild(bubbleDiv);
            messageDiv.appendChild(avatarDiv);
        } else {
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(bubbleDiv);
        }

        chatArea.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    }

    function displayTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'ai-message', 'typing-indicator');

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('message-avatar');
        avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';

        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');
        bubbleDiv.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

        if (document.documentElement.dir === 'rtl') {
            typingDiv.appendChild(bubbleDiv);
            typingDiv.appendChild(avatarDiv);
        } else {
            typingDiv.appendChild(avatarDiv);
            typingDiv.appendChild(bubbleDiv);
        }
        chatArea.appendChild(typingDiv);
        scrollToBottom();
        return typingDiv;
    }

    // --- Textarea Auto-Resize ---
    function adjustTextareaHeight() {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    }

    // --- Scroll to Bottom ---
    function scrollToBottom() {
        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: 'smooth'
        });
    }

    // --- Chat List Management ---
    function loadChat(chatId, chatTitle) {
        // در یک برنامه واقعی، اینجا پیام‌های مربوط به chatId از سرور بارگذاری می‌شوند
        currentChatId = chatId;
        currentChatTitle.textContent = chatTitle;
        chatArea.innerHTML = ''; // پاک کردن پیام‌های قبلی
        messageIndex = 0; // ریست کردن اندیس پیام برای انیمیشن
        // نمایش یک پیام خوش‌آمدگویی برای چت جدید
        const welcomeMsg = currentLang === 'fa' ? `به گفتگوی "${chatTitle}" خوش آمدید!` : `Welcome to "${chatTitle}" chat!`;
        displayMessage(welcomeMsg, 'ai');

        // فعال کردن آیتم چت در لیست
        document.querySelectorAll('.chat-list .chat-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`.chat-list .chat-item[data-chat-id="${chatId}"]`)?.classList.add('active');

        if (window.innerWidth <= 768 && sidebar.classList.contains('expanded')) {
            toggleSidebarMobile(); // بستن سایدبار در موبایل پس از انتخاب چت
        }
    }

    newChatButton.addEventListener('click', () => {
        // ایجاد یک چت جدید (در اینجا به صورت ساده)
        const newChatName = currentLang === 'fa' ? `گفتگوی جدید ${chatList.children.length + 1}` : `New Chat ${chatList.children.length + 1}`;
        const newChatId = `chat_${Date.now()}`;

        const chatItemDiv = document.createElement('div');
        chatItemDiv.classList.add('chat-item');
        chatItemDiv.dataset.chatId = newChatId;
        chatItemDiv.innerHTML = `
            <i class="far fa-comment chat-icon-item"></i>
            <span class="chat-title">${newChatName}</span>
        `;
        chatList.appendChild(chatItemDiv);
        chatItemDiv.addEventListener('click', () => loadChat(newChatId, newChatName));
        loadChat(newChatId, newChatName); // بارگذاری چت جدید
    });

    // بارگذاری اولیه چت‌های موجود در لیست (نمونه)
    document.querySelectorAll('.chat-list .chat-item').forEach(item => {
        const chatId = item.dataset.chatId || (item.querySelector('.chat-title').textContent === 'گفتگوی عمومی' || item.querySelector('.chat-title').textContent === 'General Chat' ? 'general' : `chat_${item.querySelector('.chat-title').textContent.replace(/\s+/g, '_')}`);
        item.dataset.chatId = chatId; // اطمینان از وجود شناسه
        item.addEventListener('click', () => loadChat(chatId, item.querySelector('.chat-title').textContent));
    });


    // --- Mobile Sidebar Toggle ---
    let overlayMobile = null; // برای نگهداری عنصر overlay

    function toggleSidebarMobile() {
        sidebar.classList.toggle('expanded');
        if (!overlayMobile) {
            overlayMobile = document.createElement('div');
            overlayMobile.classList.add('overlay-mobile');
            overlayMobile.addEventListener('click', toggleSidebarMobile); // بستن با کلیک روی overlay
            document.body.appendChild(overlayMobile);
        }
        overlayMobile.classList.toggle('active', sidebar.classList.contains('expanded'));
    }

    if (sidebarToggleMobileButton) {
        sidebarToggleMobileButton.addEventListener('click', toggleSidebarMobile);
    }


    // --- Event Listeners ---
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    chatInput.addEventListener('input', adjustTextareaHeight);

    // --- Initial Setup ---
    const savedTheme = localStorage.getItem('appTheme') || 'dark-mode'; // پیش‌فرض تم تیره
    applyTheme(savedTheme);
    applyLanguage(currentLang);
    adjustTextareaHeight();
    scrollToBottom();

    // بارگذاری چت پیش‌فرض یا اولین چت در لیست
    const firstChatItem = chatList.querySelector('.chat-item');
    if (firstChatItem) {
        loadChat(firstChatItem.dataset.chatId, firstChatItem.querySelector('.chat-title').textContent);
    } else {
        // اگر هیچ چتی وجود ندارد، یک چت عمومی ایجاد کنید
        const defaultChatTitle = currentLang === 'fa' ? 'گفتگوی عمومی' : 'General Chat';
        const defaultChatItem = document.createElement('div');
        defaultChatItem.classList.add('chat-item', 'active');
        defaultChatItem.dataset.chatId = 'general';
        defaultChatItem.innerHTML = `<i class="far fa-comments chat-icon-item"></i> <span class="chat-title">${defaultChatTitle}</span>`;
        chatList.appendChild(defaultChatItem);
        defaultChatItem.addEventListener('click', () => loadChat('general', defaultChatTitle));
        loadChat('general', defaultChatTitle);
    }
});
