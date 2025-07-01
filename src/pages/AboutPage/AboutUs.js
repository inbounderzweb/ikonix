import React from 'react'
import shopherobg from '../../assets/shopherobg.svg';
import shopherobgmob from '../../assets/shopheromobbg.svg';
function AboutUs() {
  return (
    <div>
         <div>

{/* Hero section for*/}
<div
  className='h-[242px] hidden md:flex w-[90%]  xl:w-[75%] mx-auto bg-center bg-cover justify-end bg-no-repeat mt-[24px]'
  style={{ backgroundImage: `url(${shopherobg})` }}
>


<span className='font-[luxia] text-[#53443D] text-[36px] leading-[112.5%] tracking-[0.5px] flex  align-middle items-center lg:mr-[80px] xl:mr-[200px]'>Lorem Ipsum <br/>dolor sit amet</span>
  
</div>
{/* End Hero section for desktop  */}



{/* Hero section for mobile*/}
<div
  className='h-[300px] flex md:hidden w-[98%] mx-auto bg-center bg-cover justify-center bg-no-repeat mt-[24px]'
  style={{ backgroundImage: `url(${shopherobgmob})` }}
>


<p className='text-center mt-[24px] font-[luxia] font-[400] text-[27px] tracking-[0.5px]'>Lorem Ipsum <br/>dolor sit amet</p>
  
</div>
{/* End Hero section mobile  */}
    </div>



    {/* <!-- BEGIN: About / Mission / Why Choose Us section --> */}
<section class="w-full text-[#3b312e] font-['Inter',sans-serif]">
  {/* <!-- Who We Are --> */}
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-16 flex flex-col md:flex-row items-center gap-10">
    {/* <!-- Illustration --> */}
    <img src="/images/about-illustration.svg" alt="Custom perfume illustration" class="w-full md:w-1/2 max-w-[480px] object-contain" />

    {/* <!-- Copy --> */}
    <div class="flex-1 space-y-4 md:pr-10">
      <h2 class="text-2xl md:text-3xl font-semibold">Who We Are</h2>
      <p>
        Ikonix is built around one simple idea – scent should be personal. We specialise in
        creating custom fragrances that capture who you are and what you love. Whether you’re
        after something entirely unique or a budget‑friendly recreation of a popular favourite,
        every Ikonix perfume is thoughtfully made with care.
      </p>
      <p>
        Our team of experienced perfumers blends quality ingredients with attention to detail,
        ensuring each fragrance isn’t just wearable but also memorable. At Ikonix, we don’t
        believe in one‑scent‑fits‑all. We’re here to help you find a fragrance that truly feels
        like you.
      </p>
    </div>

    {/* <!-- Optional floating helper icon (desktop only) --> */}
    <button class="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-[#12131a] text-white shadow-lg">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 13v6a3 3 0 01-3 3H6a3 3 0 01-3-3V9a3 3 0 013-3h6" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3h6v6" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14L21 3" /></svg>
    </button>
  </div>

  {/* <!-- Mission & Vision strip --> */}
  <div class="bg-[#f5ece8] py-12">
    <div class="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* <!-- Mission --> */}
      <div class="flex items-start gap-5">
        <div class="w-12 h-12 flex-shrink-0 rounded-full bg-white flex items-center justify-center ring-1 ring-[#d9cfc9]">
          <img src="/icons/mission.svg" alt="Mission icon" class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-lg font-semibold mb-1">Our Mission</h3>
          <p class="text-sm leading-relaxed">
            To create high‑quality, personalised fragrances that express individual style, evoke emotion, and make luxury scent experiences accessible to everyone.
          </p>
        </div>
      </div>
      {/* <!-- Vision --> */}
      <div class="flex items-start gap-5">
        <div class="w-12 h-12 flex-shrink-0 rounded-full bg-white flex items-center justify-center ring-1 ring-[#d9cfc9]">
          <img src="/icons/vision.svg" alt="Vision icon" class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-lg font-semibold mb-1">Our Vision</h3>
          <p class="text-sm leading-relaxed">
            To become a trusted name in custom perfumery by changing the way people connect with fragrance through creativity, affordability, and thoughtful craftsmanship.
          </p>
        </div>
      </div>
    </div>
  </div>

  {/* <!-- Why Choose Us --> */}
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-16">
    <h2 class="text-center text-2xl md:text-3xl font-semibold mb-12">Why Choose Us</h2>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4">
        <div class="w-16 h-16 rounded-full bg-[#b49d91]/90 flex items-center justify-center">
          <img src="/icons/personalised.svg" alt="Personalised" class="w-7 h-7" />
        </div>
        <h4 class="font-semibold">Personalised Fragrances</h4>
        <p class="text-sm leading-relaxed">We create scents that are all about your preferences.</p>
      </div>
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4">
        <div class="w-16 h-16 rounded-full bg-[#b49d91]/90 flex items-center justify-center">
          <img src="/icons/recreate.svg" alt="Scent Recreation" class="w-7 h-7" />
        </div>
        <h4 class="font-semibold">Scent Recreation</h4>
        <p class="text-sm leading-relaxed">We recreate popular favourites for you, making them more accessible without compromising on quality.</p>
      </div>
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4">
        <div class="w-16 h-16 rounded-full bg-[#b49d91]/90 flex items-center justify-center">
          <img src="/icons/ingredients.svg" alt="High‑Quality Ingredients" class="w-7 h-7" />
        </div>
        <h4 class="font-semibold">High‑Quality Ingredients</h4>
        <p class="text-sm leading-relaxed">We use safe, premium ingredients that last long and are gentle on your skin.</p>
      </div>
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4 sm:col-span-1 lg:col-span-1">
        <div class="w-16 h-16 rounded-full bg-[#b49d91]/90 flex items-center justify-center">
          <img src="/icons/pricing.svg" alt="Affordable Pricing" class="w-7 h-7" />
        </div>
        <h4 class="font-semibold">Affordable Pricing</h4>
        <p class="text-sm leading-relaxed">We offer custom blends and recreated favourites at prices that make sense.</p>
      </div>
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4 sm:col-span-1 lg:col-span-1">
        <div class="w-16 h-16 rounded-full bg-[#b49d91]/90 flex items-center justify-center">
          <img src="/icons/craftsmanship.svg" alt="Expert Craftsmanship" class="w-7 h-7" />
        </div>
        <h4 class="font-semibold">Expert Craftsmanship</h4>
        <p class="text-sm leading-relaxed">Our perfumers, with years of experience in the industry, ensure every fragrance is carefully balanced and thoughtfully made.</p>
      </div>
    </div>
  </div>
</section>
{/* <!-- END: About / Mission / Why Choose Us section --> */}








    </div>
  )
}

export default AboutUs