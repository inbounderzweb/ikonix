import React from 'react';
import shopherobg from '../../../assets/shopherobg.svg';
import shopherobgmob from '../../../assets/shopheromobbg.svg';
import Products from './Products';
import SpecialDealsSlider from '../../../components/SpecialDealsSlider/SpecialDealsSlider';
import OwnPerfume from '../../../components/ownperfume/OwnPerfume';

function Shop() {
  return (
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


<Products />
<SpecialDealsSlider />
<OwnPerfume />




    </div>
  );
}

export default Shop;
