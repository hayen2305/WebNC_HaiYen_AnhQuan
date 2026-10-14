import { Carousel } from 'react-bootstrap';
import banner1 from '../image/mth.jpg';
import banner2 from '../image/mmhn.webp';
import banner3 from '../image/banner.png';
import '../main/css/App.css';
const slides = [
  { src: banner1, alt: 'Good Morning — Cybers and Spaces' },
  { src: banner2, alt: 'Banner 2' },
  { src: banner3, alt: 'Banner 3' },
];

export default function Banner() {
  return (
    <section id="home" className="app-banner" aria-label="Welcome banner">
      <Carousel interval={4000} touch controls indicators keyboard>
        {slides.map((s, i) => (
          <Carousel.Item key={i}>
            <img className="app-banner-image d-block w-100" src={s.src} alt={s.alt} />
          </Carousel.Item>
        ))}
      </Carousel>
    </section>
  );
}