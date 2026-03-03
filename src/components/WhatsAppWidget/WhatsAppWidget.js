import React from 'react';

const WhatsAppWidget = () => {
    return (
        <a
            href="https://wa.me/919072416518"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] rounded-full shadow-lg hover:bg-[#128C7E] transition-colors"
            aria-label="Chat on WhatsApp"
        >
            {/* Simple WhatsApp icon using Unicode or you can replace with an SVG */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-8 h-8"
            >
                <path d="M20.52 3.48A11.94 11.94 0 0012 0C5.37 0 0 5.37 0 12c0 2.12.55 4.13 1.52 5.88L0 24l6.31-1.53A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.12-3.48-8.52zM12 22c-1.86 0-3.66-.5-5.22-1.38l-.37-.22-3.75.91.99-3.66-.25-.38A9.94 9.94 0 012 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.5-7.5c-.2-.1-1.19-.59-1.38-.66-.19-.07-.33-.1-.47.1-.14.2-.55.66-.68.8-.13.14-.26.16-.46.06-.2-.1-.84-.33-1.6-.99-.59-.53-.99-1.18-1.11-1.38-.12-.2-.01-.31.09-.41.09-.09.2-.23.3-.35.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.47-1.13-.64-1.55-.17-.41-.34-.35-.47-.35-.13 0-.28-.02-.43-.02-.15 0-.39.05-.6.25-.2.2-.78.76-.78 1.85s.8 2.15.91 2.3c.1.15 1.57 2.4 3.8 3.36.53.23 1 .37 1.34.47.53.17 1.01.15 1.39.09.42-.07 1.19-.49 1.36-.96.17-.47.17-.87.12-.96-.05-.09-.18-.14-.38-.24z" />
            </svg>
        </a>
    );
};

export default WhatsAppWidget;
