import React from 'react'
import shopherobg from '../../assets/shopherobg.svg';
import shopherobgmob from '../../assets/shopheromobbg.svg';
import aboutmain from '../../assets/aboutmain.svg';
import mission from '../../assets/mission.svg';
import vision from '../../assets/vision.svg';
import ch1 from '../../assets/ch1.svg';
import ch2 from '../../assets/ch2.svg';
import ch3 from '../../assets/ch3.svg';
import ch4 from '../../assets/ch4.png';
import ch5 from '../../assets/ch5.svg';
import SpecialDealsSlider from '../../components/SpecialDealsSlider/SpecialDealsSlider';
import OwnPerfume from '../../components/ownperfume/OwnPerfume';


function AboutUs() {
  return (
    <div>
         <div>

{/* Hero section for*/}
<div
  className='h-[242px] hidden md:flex w-[90%]  xl:w-[75%] mx-auto bg-center bg-cover justify-end bg-no-repeat mt-[24px]'
  style={{ backgroundImage: `url(${shopherobg})` }}
>


<span className='font-[luxia] text-[#53443D] text-[36px] leading-[112.5%] tracking-[0.5px] flex  align-middle items-center lg:mr-[80px] xl:mr-[150px]'>Lorem Ipsum <br/>dolor sit amet</span>
  
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
<section class="w-[98%] md:w-[75%] mx-auto text-[#3b312e] font-['Inter',sans-serif]">
  {/* <!-- Who We Are --> */}
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-16 flex flex-col md:flex-row items-center gap-10">
    {/* <!-- Illustration --> */}
    <img src={aboutmain} alt="Custom perfume illustration" class="w-full md:w-1/2 max-w-[480px] object-contain" />

    {/* <!-- Copy --> */}
    <div class="flex-1 space-y-4 md:pr-10">
      <h2 class="text-2xl md:text-3xl font-semibold">Who We Are</h2>
      <p className='text-[14px] text-justify'>
        Ikonix is built around one simple idea – scent should be personal. We specialise in
        creating custom fragrances that capture who you are and what you love. Whether you’re
        after something entirely unique or a budget‑friendly recreation of a popular favourite,
        every Ikonix perfume is thoughtfully made with care.
      </p>
      <p className='text-[14px] text-justify'>
        Our team of experienced perfumers blends quality ingredients with attention to detail,
        ensuring each fragrance isn’t just wearable but also memorable. At Ikonix, we don’t
        believe in one‑scent‑fits‑all. We’re here to help you find a fragrance that truly feels
        like you.
      </p>
    </div>
  </div>
</section>

   {/* <!-- Mission & Vision strip --> */}
   <div className='w-full bg-[#EDE2DD]'>
  <div class="py-12">
    <div class="mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 w-[98%] md:w-[75%]">
      {/* <!-- Mission --> */}
      <div class="flex items-start gap-5">
        <div class="w-12 h-12 flex-shrink-0 rounded-full bg-white flex items-center justify-center ring-1 ring-[#d9cfc9]">
          <img src={mission} alt="Mission icon" class="w-24 p-2" />
        </div>
        <div>
          <h3 class="text-lg font-semibold mb-1 font-[Luxia] text-[#8C7367]">Our Mission</h3>
          <p class="leading-relaxed font-[Lato] text-[16px] font-[400] text-[#53443D]">
            To create high‑quality, personalised fragrances that express individual style, evoke emotion, and make luxury scent experiences accessible to everyone.
          </p>
        </div>
      </div>
      {/* <!-- Vision --> */}
      <div class="flex items-start gap-5">
        <div class="w-12 h-12 flex-shrink-0 rounded-full bg-white flex items-center justify-center ring-1 ring-[#d9cfc9]">
          <img src={vision} alt="Vision icon" class="w-24 p-2" />
        </div>
        <div>
          <h3 class="text-lg font-semibold mb-1 font-[Luxia] text-[#8C7367]">Our Vision</h3>
          <p class="leading-relaxed font-[Lato] text-[16px] font-[400] text-[#53443D]">
            To become a trusted name in custom perfumery by changing the way people connect with fragrance through creativity, affordability, and thoughtful craftsmanship.
          </p>
        </div>
      </div>
    </div>
  </div>
  </div>

  {/* <!-- Why Choose Us --> */}
  <div class=" mx-auto py-16 w-[98%] md:w-[75%]">
    <h2 class="text-center text-2xl md:text-3xl text-[#B39384] font-[luxia] mb-12">Why Choose Us</h2>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4">
          <img src={ch1} alt="Personalised" class="w-24" />
       
        <h4 class="font-[Lato] font-[700] text-[21px] text-[#53443D]">Personalised Fragrances</h4>
        <p class="font-[Lato] text-[16px] font-[400] text-[#53443D]">We create scents that are all about your preferences.</p>
      </div>
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4">
          <img src={ch2} alt="Scent Recreation" class="w-24" />
        
        <h4 class="font-[Lato] font-[700] text-[21px] text-[#53443D]">Scent Recreation</h4>
        <p class="font-[Lato] text-[16px] font-[400] text-[#53443D]">We recreate popular favourites for you, making them more accessible without compromising on quality.</p>
      </div>
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4">
          <img src={ch3} alt="High‑Quality Ingredients" class="w-24" />
        <h4 class="ffont-[Lato] font-[700] text-[21px] text-[#53443D]">High‑Quality Ingredients</h4>
        <p class="font-[Lato] text-[16px] font-[400] text-[#53443D]">We use safe, premium ingredients that last long and are gentle on your skin.</p>
      </div>
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4 sm:col-span-1 lg:col-span-1">
          <img src={ch4} alt="Affordable Pricing" class="w-24" />
        <h4 class="font-[Lato] font-[700] text-[21px] text-[#53443D]">Affordable Pricing</h4>
        <p class="font-[Lato] text-[16px] font-[400] text-[#53443D]">We offer custom blends and recreated favourites at prices that make sense.</p>
      </div>
      {/* <!-- Card --> */}
      <div class="flex flex-col items-center text-center bg-[#f5ece8] rounded-lg p-8 space-y-4 sm:col-span-1 lg:col-span-1">
          <img src={ch5} alt="Expert Craftsmanship" class="w-24" />
        <h4 class="font-[Lato] font-[700] text-[21px] text-[#53443D]">Expert Craftsmanship</h4>
        <p class="font-[Lato] text-[16px] font-[400] text-[#53443D]">Our perfumers, with years of experience in the industry, ensure every fragrance is carefully balanced and thoughtfully made.</p>
      </div>
    </div>
  </div>

{/* <!-- END: About / Mission / Why Choose Us section --> */}



<SpecialDealsSlider />
<OwnPerfume />




    </div>
  )
}

export default AboutUs