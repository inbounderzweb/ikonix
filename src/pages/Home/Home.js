import React from 'react'
import SliderComponent from '../../components/home-hero-slider/sliders/SliderComponent'
import MobileSlider from '../../components/home-hero-slider/sliders/MobileSlider'
import CollectionCards from '../../components/collectioncards/CollectionCards'
import SpecialDealsSlider from '../../components/SpecialDealsSlider/SpecialDealsSlider'
import OwnPerfume from '../../components/ownperfume/OwnPerfume'
import UspSection from '../../components/UspSection/UspSection'
import InstagramShowcase from '../../components/InstagramShowcase/InstagramShowcase'
import Testimonials from '../../components/Testimonials/Testimonials'
import BlogList from '../../components/Blogs/BlogList'
import ProductList from '../products/ProductList'

function Home() {
  return (
    <div className=''>
      <div className='hidden md:block'><SliderComponent /></div>
        <div className='block md:hidden'><MobileSlider/></div>
        <div><CollectionCards /></div>
        <div><ProductList/></div>
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