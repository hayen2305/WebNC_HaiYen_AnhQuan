import { Navbar, Nav, Container } from 'react-bootstrap';
import { logout } from '../api';

export default function Header() {
  return (
    <Navbar expand="md" bg="light" className="app-header">
      <Container fluid>
        <Navbar.Brand href="#home" className="text-uppercase">My App</Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="ms-auto">
            <Nav.Link href="#home">Home</Nav.Link>
            <Nav.Link href="#students">Students</Nav.Link>
            <Nav.Link href="#about">About</Nav.Link>
            <Nav.Link href="#logout" onClick={logout}>Logout</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
