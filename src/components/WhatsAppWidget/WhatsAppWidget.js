import React from 'react';
import waicon from '../../assets/whatsapp.png';

const WhatsAppWidget = () => {
    return (
        <a
            href="https://wa.me/919072416518"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center bg-[#25D366] rounded-full shadow-lg hover:bg-[#128C7E] transition-colors"
            aria-label="Chat on WhatsApp"
        >
            {/* Simple WhatsApp icon using Unicode or you can replace with an SVG */}
            <img src={waicon} alt="WhatsApp" className="w-8 h-8" />
        </a>
    );
};

export default WhatsAppWidget;
