import * as React from 'react';
import {
  Grid
} from "@mui/material";
import Gravatar from 'react-gravatar'
import TypeAnimation from 'react-type-animation';
import {Container, Nav} from "react-bootstrap";
import './Home.sass';

export default function Home() {

  return (
      <Container fluid style={{backgroundColor: "#494949"}}>
        <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{minHeight: '100vh'}}
        >
          {/*<Container fluid className={"pb-3"} style={{maxHeight: "30vh"}}>
          </Container>*/}
          <Gravatar email="dovixman@gmail.com" size={150}
                    className={"mt-3 mb-3"}
                    style={{borderRadius: "50%"}}/>
          <TypeAnimation
              cursor={true}
              repeat={Infinity}
              className="text-light"
              sequence={[
                '> David Fuentes_', 5000,
                '> Technical Lead_', 1000,
                '> Software Architect_', 1000,
                '> Cybersecurity Specialist_', 1000,
                '> ML Engineer_', 1000,
                '> React Developer_', 1000,
                '> Free Time Photographer 📸_', 1000,
                '> Blockchain tech geek_'
              ]}
              wrapper="h1"
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
        </Grid>
      </Container>
  );
}