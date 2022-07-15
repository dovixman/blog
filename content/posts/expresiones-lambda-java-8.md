---
title: "Java 8: Expresiones Lambda"
date: "2019-02-03"
draft: false

categories:
  - "java"
tags:
  - "lambda-expressions"
  - "functional-programming"
---

Las expresiones lambda son una de las múltiples funcionalidades nuevas que nos ofrece Java 8. Estas expresiones son parte de los primeros pasos de Java hacia la programación funcional, y su cometido es introducirnos a las funciones anónimas mediante las cuales podemos definir el comportamiento de los objetos, y los datos que encapsulan.

> **_¿En qué consiste la programación funcional?_**
La programación funcional es un paradigma de programación basado en las funciones matemáticas, que especifica que una función que recibe un parámetro X, siempre devolverá un resultado Y.  
Este paradigma permite definir comportamiento mediante funciones, pudiendo inyectarlo como parámetro de entrada en los objetos, o devolverlo como resultado de otro método.


## Introducción a las funciones lambda

Por tanto, deducimos de lo anterior, que las funciones lambda son la funcionalidad que Java ofrece para facilitar la definición de comportamiento mediante parámetros.

Una función lambda consta de los siguientes elementos:

- **Parámetros de entrada**
- **Operador lambda**
- **Cuerpo del método**

![](images/lambda_expression.jpg)

Ejemplo de expresión lambda

El primer elemento de la expresión lambda, los **parámetros de entrada** se puede definir como:

- Expresión lambda sin parámetros de entrada

() -> System.out.println("Hello Lambda World!")

- Expresión lambda con un parámetro de entrada simple

x -> x + 10

- Expresión lambda con múltiples parámetros de entrada

(int x, int y) -> { return x + y; } ﻿

Con respecto al cuerpo del método, para los métodos con una única línea de código no es necesario definir las llaves.

// Expresión lambda con dos parámetros de entrada sin return definido
(String x, String y) -> x.length() - y.length()

Mientras que para métodos con varias líneas, las llaves serán obligatorias.

// Expresión lambda con varias líneas de código como cuerpo
(String x) -> {     
    //Code...     
    return x.length();
}﻿


### Referenciando variables externas

Las expresiones lambda pueden hacer referencia a **variables locales finales, o efectivamente finales** dentro de la clase donde se definen.

_**¿Y qué es eso de variables efectivamente finales?**_ Las variables efectivamente finales son variables que, aunque no se definen explícitamente como finales, cumplen los requisitos para poder serlo.

En el siguiente ejemplo podemos ver cómo se utiliza la variable "_before_" , una variable efectivamente final, dentro de la expresión lambda que filtra los resultados de la lista de ficheros.

//Utilizando variables efectivamente finales dentro de funciones lambda
void expire(File root, long before) {  
    root.listFiles(File p -> p.lastModified() <= before);
}


### Referencia "**_this"_** en las funciones lambda

El uso de "_this_" en las expresiones lambda hace referencia al objeto en el cual se ha definido la expresión. Siguiendo con el ejemplo anterior, se podría definir una variable final en el objeto que encapsula al método "_expire_", y utilizar "_this_" para hacer referencia a dicha variable.

//Referenciando a 'this' dentro de una función lambda
public final long currentDate = new Date().getTime();

void expire(File root) {  
    root.listFiles(File p -> p.lastModified() <= this.currentDate);
}

Esto es así debido a que las expresiones lambda no son más que una representación de funciones anónimas, y estas no están asociadas a ninguna clase, por tanto, una función lambda no puede referenciarse a sí misma.


### Creando nuestra propia expresión lambda con interfaces funcionales

Ahora que ya sabemos cómo funcionan las expresiones lambda, podemos empezar a crear las nuestra. Para ello utilizaremos **[interfaces funcionales](https://davidfuentes.blog/2019/03/11/java-8-interfaces-funcionales/).**

Las **interfaces funcionales** son aquellas que definen un único método _abstracto._ Las interfaces funcionales también pueden definir a su vez tantos métodos _estáticos_ y métodos _default_ como sean necesarios.

Para crear nuestra interfaz funcional, deberemos utilizar la anotación _@FunctionalInterface._

@FunctionalInterface
public interface Math{
    int calculate(int x, int y);
}

Una vez creada nuestra interfaz funcional, podremos instanciarla utilizando una expresión lambda, tal y como se define a continuación:

public class Test{

    public static void main(String\[\] args){
        executeMath(5,3,(x,y)->x\*y);
    }

    public int executeMath(int x, int y, Math math){
        return math.calculate(x, y);
    }
}

Si quieres saber más acerca de las interfaces funcionales puedes hacerlo [aquí](https://davidfuentes.blog/2019/03/11/java-8-interfaces-funcionales/).
