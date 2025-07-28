import React from 'react'
import info from '../../assets/info.svg'
import info1 from '../../assets/info1.svg'
import info2 from '../../assets/info2.svg'

function CollectionCards() {
  return (
    <div className='mx-auto w-[95%] lg:w-[75%] mt-[20px]'>


<div className='grid grid-cols-1 md:grid-cols-2 lg:flex  gap-5'>

<div className='w-full h-36 rounded-[24px] bg-no-repeat bg-cover bg-center' style={{ backgroundImage: `url(${info})`}}></div>
<div className='w-full h-36 rounded-[24px] bg-no-repeat bg-cover bg-center' style={{ backgroundImage: `url(${info1})`}}></div>
<div className='w-full h-36 rounded-[24px] bg-no-repeat bg-cover bg-center' style={{ backgroundImage: `url(${info2})`}}></div>

</div>

    </div>
  )
}

export default CollectionCards