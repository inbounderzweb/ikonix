import React from 'react'
import info from '../../assets/info.svg'
import info1 from '../../assets/info1.svg'
import info2 from '../../assets/info2.svg'

function CollectionCards() {
  return (
    <div className='mx-auto w-[95%] md:w-full'>
      <div className='grid grid-cols-1 md:flex gap-4 md:gap-8 mx-auto justify-center items-center align-middle pt-6'>
      <div>
        <img className='w-full' src={info} alt='info-image' />
      </div>

      <div>
      <img className='w-full' src={info1} alt='info-image1' />
      </div>

      <div>
      <img className='w-full' src={info2} alt='info-image2' />
      </div>

      </div>
    </div>
  )
}

export default CollectionCards