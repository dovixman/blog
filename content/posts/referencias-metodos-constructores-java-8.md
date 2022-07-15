---
title: "Java 8: Referencias a métodos y constructores"
date: "2019-03-18"
draft: false

categories:
  - "java"
tags:
  - "constructor-reference"
  - "method-reference"
---

La referenciación a métodos y constructores es otra de las funcionalidades que nos ofrece Java 8, y que nos permite utilizar dichas referencias a modo de [](https://davidfuentes.blog/2019/02/03/java-8-expresiones-lambda/)**_[expresiones lambda](https://davidfuentes.blog/2019/02/03/java-8-expresiones-lambda/)_**.

Estas referencias son lo que en inglés se denomina "_[syntactic sugar](https://en.wikipedia.org/wiki/Syntactic_sugar)_", y consiste en pequeños añadidos a la sintaxis de Java diseñados para hacer algunas construcciones más fáciles de leer o expresar.

Las referencias a métodos y constructores sólo pueden ser utilizadas cuando la [**_interfaz funcional_**](https://davidfuentes.blog/2019/03/11/java-8-interfaces-funcionales/) coincide con el patrón del método referenciado.

public static void main(String\[\] args){
   // Normal lambda expression
   Consumer<String> consumer1 = (x) -> System.out.println(x);
   consumer1.accept("Hello consumer1");

   // Lambda expression with a method reference
   Consumer<String> consumer2 = System.out::println;
   consumer2.accept("Hello consumer2");
}

En el siguiente ejemplo podemos ver que el patrón esperado por el compilador en el momento de definir la expresión lambda es la de la interfaz funcional **_Consumer<T>_**, que recibe un parámetro de entrada, y no devuelve nada. Esto nos permite hacer referencia a métodos que tengan ese mismo patrón, como el que se hace referencia en el ejemplo, **_System.out::println_**.

@FunctionalInterface
public interface Consumer<T> {
    // Referenced method
    void accept(T t);

    default Consumer<T> andThen(Consumer<? super T> after) {
        Objects.requireNonNull(after);
        return (T t) -> { accept(t); after.accept(t); };
    }
}

Al tener la información necesaria para inferir los parámetros de entrada, los parámetros de salida y el comportamiento a aplicar en la expresión lambda, es el compilador el que hace el resto del trabajo por nosotros, pudiendo utilizar las referencias a métodos y constructores sin necesidad de definir cómo queremos utilizar las variables de entrada o salida, como haríamos con una expresión lambda basada en una interfaz funcional.

Las reglas para utilizar las referencias mencionadas en expresiones lambda se pueden dividir en tres:

- Referencias a métodos estáticos
- Referencias a métodos sobre una instancia de un objeto
- Referencias a métodos sobre la instancia del objeto sobre el cual se crea la expresión lambda

![](https://lh6.googleusercontent.com/V7jgH1uQLvBqQ6Zqgwl1aGTIEVzbVKkrqa2IYNaUQFlmjg-ad15Gn_hppQ-jEP_sEsKYDVvHzK7bzWJMpJcjEuZDxkMbMtvjnUAf9rU_YelxLzvtKDP_lIN784quBPX3bdIipNsCowoaA7sczg)


Reglas aplicables al referenciar métodos en expresiones lambda

A continuación se puede encontrar un ejemplo de cada una de las reglas listadas en la imagen anterior:

![](https://lh3.googleusercontent.com/eoio3bA8J5g9rRqPHELu4skE4P0LaiFGKc_Nsz83q5rjMvoES_01GLLCt9b6aECwtEnQhyt79yJf3e1_QG6tgtg22SjbV6qduPonLnxemQJlklLTfBP9eY0AZwbPQ3J4UDgLddX6wwba0yN36w)

Ejemplo de referencias a métodos en expresiones lambda

De la misma forma, para hacer referencia a un constructor, utilizamos la misma lógica anterior, utilizando la palabra clave _**new**_ para instanciar el objeto.

public static void main(String\[\] args){
   // Normal constructor call
   Factory<List<String>> f = () -> return new ArrayList<String>();

   // Constructor reference call
   Factory<List<String>> f = ArrayList<String>::new;
}
