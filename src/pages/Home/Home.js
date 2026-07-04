import React from 'react'
import SliderComponent from '../../components/home-hero-slider/sliders/SliderComponent'
import MobileSlider from '../../components/home-hero-slider/sliders/MobileSlider'
import CollectionCards from '../../components/collectioncards/CollectionCards'
import SpecialDealsSlider from '../../components/SpecialDealsSlider/SpecialDealsSlider'
import OwnPerfume from '../../components/ownperfume/OwnPerfume'
import UspSection from '../../components/UspSection/UspSection'
import InstagramShowcase from '../../components/InstagramShowcase/InstagramShowcase'
import Testimonials from '../../components/Testimonials/Testimonials'
import ProductList from '../products/ProductList'
import BrandBanner from '../../components/PromoBanner/PromoBanner'
import BlogList from '../../components/Blogs/BlogList'


function Home() {

  return (
    <div className=''>
      <div className='hidden md:block bg-[#EDE2DD] pb-12'><SliderComponent />
      <CollectionCards />
      </div>
      <div className='block md:hidden bg-[#EDE2DD]'><MobileSlider />
      <CollectionCards />
      </div>
      <div className='bg-[#F8F6F4]'><ProductList /></div>
      <div><BrandBanner/></div>
      <div><SpecialDealsSlider /></div>
      <div><OwnPerfume /></div>
      <div><UspSection /></div>
      <div><InstagramShowcase /></div>
      <div><Testimonials /></div>
      <div><BlogList /></div>


    </div>
  )
}

export default Home
