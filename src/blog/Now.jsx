import * as React from 'react';
import Gravatar from 'react-gravatar'
import {Container, Nav} from "react-bootstrap";

export default function Now() {

  return (
      <Container fluid style={{backgroundColor: "#494949"}}>
        <Gravatar email="dovixman@gmail.com" size={150}
                  className={"mt-3 mb-3"}
                  style={{borderRadius: "50%"}}/>
        />
        <Container className={"pt-3"}>
          <Nav
              /*justify*/
              /*fill*/
              /*variant="pills"*/
              className="mt-3 justify-content-center text-light"
              activeKey="/home"
              onSelect={(selectedKey) => alert(`selected ${selectedKey}`)}
          >
            <Nav.Item>
              <Nav.Link eventKey={"/home"}>Home</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={"/now"}>Now</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={"/blog"}>Blog</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={"/contact"}>Contact</Nav.Link>
            </Nav.Item>
          </Nav>
        </Container>
      </Container>
  );
}