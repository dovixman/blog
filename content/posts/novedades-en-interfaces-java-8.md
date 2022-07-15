---
title: "Java 8: Novedades en interfaces"
date: "2019-03-25"
draft: false

categories:
  - "java"
tags:
  - "interfaces"
---

Hasta Java 8, las interfaces únicamente podían implementar métodos públicos y abstractos por defecto.

En la versión de Java 8 esto ha cambiado, se ha extendido la funcionalidad de las interfaces, de modo que puedan albergar métodos _**estáticos**_ y métodos _**default**_ que nos permiten definir lógica de negocio dentro de las propias interfaces.

## Métodos default

El objetivo que se persigue con este tipo de funcionalidad es dar a las interfaces la capacidad de definir un comportamiento estándar para toda clase que las implemente, pudiendo especializar cualquiera de los métodos definidos sobreescribiéndolos en la propia implementación de la clase.

Esto evita las duplicaciones de código en clases que implementen el mismo comportamiento estándar. Además, facilita la extensión de nuestra arquitectura (**_Open/Closed principle_**), ya que al definir una implementación por defecto para los nuevos método en la interfaz, no estamos obligados a definirlos en cada una de las clases que la implementen, ofreciendo así cierta retrocompatibilidad.

El siguiente ejemplo define una interfaz con un método _default,_ y muestra cómo utilizarlo en una clase que lo implemente.

public interface MyInterface {

    // Default method for getting "Hello World" String
    default String defaultHelloWorld(){
        return "Default Hello World!";
    }

}

class MyClass implements MyInterface {

    public static void main(String\[\] args) {
        MyClass myClass = new MyClass();

        System.out.println("Default: " + myClass.defaultHelloWorld());
    }

}

Y obtenemos los resultados esperados.

//Result
Default: Default Hello World!

## Métodos estáticos

Los métodos _estáticos_ siguen la misma idea que los _default_, permitir definir lógica de negocio dentro de nuestra interfaz, y evitar así duplicados de código innecesarios. Y como he mencionado anteriormente, también ayudan a que nuestro código sea fácilmente extensible y mantenible.

La diferencia con respecto a los métodos _default_, es que al ser estáticos, los métodos que definamos no serán sobreescribibles en las clases que implementen la interfaz.

public interface MyInterface{

    // Static method for getting "Hello World" String
    static String staticDefaultHelloWorld(){
        return "Static Hello World!";
    }

}

class MyClass implements MyInterface {

    public static void main(String\[\] args) {
        MyClass myClass = new MyClass();

        System.out.println("Static: " + MyClass.staticDefaultHelloWorld());
    }

}

Y obtenemos los resultados.

//Result
Static: Static Hello World!

Pero como siempre, con las nuevas funcionalidades, también se plantean diversas casuísticas que pueden llevarnos a confusión.

## Implementar múltiples interfaces con las mismas funciones _default_

Utilizando los métodos default podría darse el caso de tener una clase que implemente varias interfaces, que contengan un mismo método.

No hay jerarquía entre ambas interfaces, por lo que el compilador no sabrá cuál de las dos seleccionar a la hora de invocar el método.

public interface Interface1 {
    default String getHelloWorldStr(){
        return "Hello world from Interface 1";
    }
}

public interface Interface2 {
    default String getHelloWorldStr(){
        return "Hello world from Interface 2";
    }
}

Por tanto, la clase que implemente ambas interfaces se verá obligada a sobrescribir el método _**getHelloWorld**_ por el compilador, para evitar errores de compilación.

public class HelloWorldClass implements Interface1, Interface2 {
    @Override
    public String getHelloWorldStr() {
        return "Hello World from HelloWorldClass";
    }
}

## El problema del diamante

Existe un caso, muy parecido al anterior, llamado problema del diamante. Este problema consiste en la ambigüedad que surge como consecuencia de la herencia múltiple, y que provoca que el método que hay que invocar no pueda ser extraído mediante las [reglas de resolución de conflictos de las interfaces de Java](#reglas-seleccion-metodos-default).

Este es un problema común entre los lenguajes que permiten la herencia múltiple, y su nombre viene de la forma que toma la definición de esta arquitectura.

![Problema del diamante](images/problema-del-diamante-1.png)

Problema del diamante

Imaginemos un escenario en el cual existen dos interfaces, _Interface1_ e _Interface2,_ que extienden de una tercera interfaz _Interface0._

interface Interface0 {
    default String getHelloWorldStr(){
        return "Hello world from Interface 0";
    }
}

interface Interface1 extends Interface0{
    default String getHelloWorldStr(){
        return "Hello world from Interface 1";
    }
}

interface Interface2 extends Interface0{
    default String getHelloWorldStr(){
        return "Hello world from Interface 2";
    }
}

Como se puede observar en el código anterior, las interfaces _Interface1_, e **Interface2** quedan al mismo nivel jerárquico, mientras que Interface0 queda por debajo de estas. Esto genera un problema, ya que al no existir una cadena jerárquica, el compilador no es capaz de inferir el método a utilizar, y nos forzará a reescribirlo explícitamente en nuestra clase.

public class MyClass implements Interface1, Interface2 {

    // Overwritten method from both Interface1 and Interface2 interfaces.
    @Override
    public String getHelloWorldStr() {
        return "Hello World from MyClass";
    }

    public static void main(String\[\] args) {
        MyClass myClass = new MyClass();

        System.out.println(myClass.getHelloWorldStr());
    }
}

Obteniendo como resultado el de la implementación de la clase.

//Result
Hello World from MyClass

## Reglas para la selección de métodos _default_

Como he comentado antes, existen ciertas reglas que el compilador de Java aplica cuando necesita seleccionar la implementación de un método definido en múltiples interfaces, ya que la herencia múltiple necesita de este tipo de soluciones.

El compilador necesita una jerarquía de prioridades que aplicar cuando existen múltiples instancias del mismo método al que se hace referencia desde distintas interfaces y clases. Por este motivo, el compilador aplica una serie de reglas para aplicar dicha jerarquía:

- La implementación de las clases o superclases siempre tienen prioridad.

public interface Interface1 {
    default String getHelloWorldStr(){
        return "Hello world from Interface 1";
    }
}

class HelloWorldClass implements Interface1{
    @Override
    public String getHelloWorldStr() {
        return "Hello World from HelloWorldClass";
    }

    public static void main(String\[\] args) {
        HelloWorldClass helloWorldClass = new HelloWorldClass ();
        System.out.println(helloWorldClass.getHelloWorldStr());
    }
}

En este caso el resultado sería el definido en la implementación de la clase, que tiene prioridad con respecto al definido en la interfaz.

//Result
Hello World from HelloWorldClass

- Si no existe implementación para el método en la clase, siempre se utilizará la implementación del método _default_ más específico definido en las interfaces heredadas

public interface Interface1 {
    default String getHelloWorldStr(){
        return "Hello world from Interface 1";
    }
}

public interface Interface2 extends Interface1 {
    default String getHelloWorldStr(){
        return "Hello world from Interface 2";
    }
}

public class HelloWorldClass implements Interface1, Interface2 {
    public static void main(String\[\] args) {
        HelloWorldClass helloWorldClass = new HelloWorldClass ();
        System.out.println(helloWorldClass.getHelloWorldStr());
    }
}

En este caso, la implementación del método de la interfaz _Interface2_ es la más específica en la cadena jerárquica, y será la que el compilador seleccione.

//Result
Hello world from Interface 2
