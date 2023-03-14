import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (

    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>

        <div className='home-logo'>
          <h2>
            <Link to='/'>logo</Link>
          </h2>
        </div>
        <nav
          style={{ display: 'flex', justifyContent: 'space-between', width: '550px', alignItems: 'center' }}
        >
          <Link className="text-decoration-none" to='/'>HOME</Link>
          <Link className="text-decoration-none" to='/excel-to-json'>Excel to json</Link>
          <Link className="text-decoration-none" to='/json-structure'>json structure</Link>
          <Link className="text-decoration-none" to='/test-api'>Test API</Link>
          <Link className="text-decoration-none" to='/support'>Contact us</Link>
        </nav>
        <nav
          style={{ display: 'flex', justifyContent: 'space-between', width: '150px', alignItems: 'center' }}
        >
          <Link to="/login?sign-in" >sign in</Link>

          <Link to="/login?sign-up">sign up</Link>
        </nav>
      </header>

      <section>

        <div>
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Quos animi itaque fugit maiores odit, architecto eum vero porro ipsa. Ab omnis consequatur quasi aliquid repudiandae quisquam laboriosam iure porro praesentium!
          Repudiandae amet magnam ipsum doloremque a iure aspernatur consequuntur rerum dolore eligendi dolorem illo natus nulla explicabo mollitia ad perspiciatis, fuga sit numquam dicta. Itaque quasi omnis esse eaque consequatur.
          Non saepe animi provident corrupti voluptatibus. Assumenda explicabo dolor aperiam beatae officiis obcaecati corrupti laborum laboriosam repudiandae, possimus sint officia. Officia corporis non maiores quod incidunt amet, quidem eius rerum.
          Odio provident sapiente quibusdam tempore doloremque ducimus, dolore magni? Dolorum ratione tempora sed sapiente iure vel perspiciatis ipsum non! Doloremque, placeat nisi. Sit id inventore magnam rem cum pariatur animi.
          Sunt nam magni debitis ratione! Et nam eum nobis animi quia? Non odio nemo nobis ab itaque rerum aliquam magnam nisi natus quod, rem sunt quis excepturi cum beatae illo.
          Sunt, magni! Eligendi veritatis, omnis labore eveniet dignissimos debitis repellendus. Esse provident numquam repellat error quisquam commodi quas consequatur architecto, in mollitia hic quasi recusandae, dolorum alias voluptates quo? Temporibus.
          Voluptates vitae ducimus, aut deserunt, aliquam esse assumenda laboriosam aliquid eos, illo itaque minus. Magnam magni quos soluta laboriosam quidem quas porro modi necessitatibus voluptatibus rerum neque, culpa ipsa praesentium.
          Consequuntur obcaecati, beatae velit aliquid repudiandae ex ipsam ipsum voluptatum inventore nihil nam deleniti facere praesentium tempore? Laborum deleniti, accusantium, dolorum error eos, commodi fugiat suscipit ut maiores provident eaque!
          Mollitia cum delectus ea amet ullam et illum repellendus sapiente maiores fugiat! Rem necessitatibus deleniti dolorem est! Eveniet, officiis! Quasi odit adipisci optio ipsam vero autem ea laudantium eveniet dicta!
          Enim, modi minima sunt quaerat animi harum delectus veritatis, culpa perspiciatis eveniet beatae ratione a soluta reprehenderit magnam fugiat eaque consectetur, nihil ipsum. Est beatae maiores sed animi asperiores reprehenderit.
          Quaerat quibusdam ipsa, optio ullam perspiciatis libero repellendus nam ad at aperiam aspernatur dolorem dolor ratione. Illo corporis ab maxime vitae nulla! Repellat odit molestiae ut tempora culpa voluptates saepe.
          Officiis vel error illum hic, fugit id explicabo quod incidunt eum doloremque molestias qui consectetur nobis itaque distinctio dolorum quo odio expedita minus! Doloribus, unde officia veritatis modi illum repellendus!
          Necessitatibus error consectetur dolores nobis vel fugiat nesciunt non illo amet, ipsam odit tempore atque quia voluptas distinctio totam voluptates corrupti architecto quam? Laboriosam minus ex incidunt maxime esse labore!
          Ea voluptatum vitae tempore placeat, iure consequuntur voluptatem amet dolore ab laborum? Velit consequatur adipisci ratione corporis voluptatum commodi magnam aut eum? Pariatur, expedita! Perspiciatis itaque animi inventore doloremque ducimus?
          Iusto officia harum tenetur rerum! Iste, dicta unde eum suscipit possimus doloremque fugit tenetur quasi? Distinctio, neque assumenda vero quam cumque vitae. Animi quos tenetur quasi? Quibusdam iure pariatur repellendus.
          Repellendus exercitationem error expedita eos ut, iste nam id ea dolore et consequuntur suscipit sapiente asperiores vel similique maxime ducimus nesciunt? Id inventore ratione exercitationem magni eius labore quia repellat.
          Voluptates dolor minus voluptatum eligendi alias molestias, harum, laudantium, delectus perspiciatis recusandae repellat odit? Repudiandae suscipit tenetur est neque, rem unde dignissimos sit explicabo dolor ad rerum totam pariatur placeat?
          Temporibus totam officia veritatis pariatur laboriosam necessitatibus quas, inventore corrupti omnis culpa. Blanditiis dolor accusantium beatae explicabo tenetur? Officia assumenda modi non facere animi consequuntur blanditiis repellendus temporibus, nesciunt ad.
          Ex vel nulla eveniet consequatur. Minus mollitia cumque earum eum, ipsa, modi et facere voluptatem officia voluptatum tempore labore molestias sequi quibusdam accusantium unde dignissimos aperiam? Architecto iure magni inventore?
          Praesentium quam dolor magni nemo hic officia doloribus quo architecto iure sequi eius molestias ab aliquam, iste mollitia facilis dolorem similique provident reiciendis, repellat velit reprehenderit voluptatum tempora. Ipsam, beatae?
        </div>
      </section>

    </div>
  )
}

export default Home