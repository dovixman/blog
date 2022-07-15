# Java 8: Streams


Junto con las [expresiones lambda](https://davidfuentes.blog/2019/02/03/java-8-expresiones-lambda/), los _Streams_ son una de las funcionalidades más relevantes de Java 8, y trae consigo una nueva forma de trabajar. Mediante una capa de abstracción, los _Streams_ nos permiten definir la lógica de negocio como un conjunto de funciones que se ejecutan de forma anidada.

De este modo, podemos trabajar con colecciones utilizando el paradigma de programación funcional, que nos permite definir las funciones a ejecutar de una forma mucho más clara y, en cierto modo, lo más parecida posible a como lo haríamos las personas en una situación real.

El siguiente código muestra la lógica de un programa que filtra una lista de enteros, y devuelve el valor más pequeño de la lista, sin tener en cuenta los números pares:

```java
public static void main(String\[\] args) {
    List<Integer> integers = Arrays.asList(3, 12, 21, 4, 2, 7, 5);
    Integer min = integers.get(0);

    for (Integer next : integers) {
        if (next % 2 == 0)
            continue;
        if (next < min) {
            min = next;
        }
    }

    System.out.println(min);
}
```

Ahora veremos cómo se escribiría este mismo código utilizando _Streams_.

```java
public static void main(String\[\] args) {
    List<Integer> integers = Arrays.asList(3, 12, 21, 4, 2, 7, 5);

    Optional<Integer> min = integers.stream()
            .filter(integer -> integer % 2 != 0)
            .min(Integer::compareTo);

    System.out.println(min.get());
}
```

Como se puede observar, el código queda mucho más claro, ya que se organiza por funciones anidadas, que se ejecutan como un flujo de trabajo, generando nuevos _Stream_s a medida que avanzan en la cadena de ejecución.

## Elementos de un Stream

Como ya he comentado, los _Streams_ son abstracciones que nos permiten definir operaciones agregadas sobre una fuente de datos utilizando funciones.

Los _Streams_ se componen de tres partes:

- [La fuente de datos](#fuentes-de-datos)
- [Las operaciones intermedias](#operaciones-intermedias)
- [La operación terminal](#operaciones-terminales)

// Fuente de datos: 1
Stream.of("Some, Comma, Separated, Values")

// Operaciones intermedias: 0 -> N
.flatMap(string -> Stream.of(string.split(",")))
.map(string -> string.trim())

//Operación terminal: 1
.forEach(System.out::println);

![Stream
Source
Intermediate
Operation
Stream
Intermediate
Operation
Stream
Terminal
Result
Operation ](https://lh5.googleusercontent.com/59vUmdkejTGzsy-3q7TQxOsL33z8vVkY1ET8u0IFNGJhaSyy78i2Th7jGW1_vc1c7k_Rr6g7ljPeO5DPzLtTJIPkIrbRb-LrZxzlLVnePevqjCsG-VzIuq4IvOQtQ9q3v1KVl7RVzZeLgNuEiA)

### Fuentes de datos

La fuente de datos consiste en una colección de datos que pueden ser tratados como una cadena de valores.

Java ofrece distintas fuentes de _Streams_ para ciertas clases:

<table class="wp-block-table has-fixed-layout is-style-stripes"><tbody><tr><td><strong>Collection.stream()</strong></td><td><strong>JarFile.stream()</strong><br><strong>ZipFile.stream()</strong></td></tr><tr><td><strong>Collection.parallelStream()</strong></td><td><strong>BufferedReader.lines()</strong></td></tr><tr><td><strong>Arrays.stream()</strong></td><td><strong>Pattern.splitAsStream()</strong></td></tr><tr><td><strong>Files.find(Path, BiPredicate, FileVisitOption)</strong></td><td><strong>CharSequence.chars()</strong></td></tr><tr><td><strong>Files.list(Path)</strong></td><td><strong>CharSequence.codePoints()</strong></td></tr><tr><td><strong>Files.lines(Path)</strong></td><td><strong>BitSet.stream()</strong></td></tr><tr><td><strong>Files.walk(Path, FileVisitOption)</strong></td><td><strong>Random().Ints()</strong><br><strong>Random().Doubles()</strong><br><strong>Random().Longs()</strong></td></tr></tbody></table>

También podemos utilizar **métodos estáticos** para crear _Streams_ a partir de datos existentes:

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>Stream.concat(Stream, Stream)</strong></td><td>Concatena dos <em>Streams</em> existentes y devuelve el <em>Stream </em>resultante.</td></tr><tr><td><strong>Stream.of(T… values)</strong></td><td>Crea un <em>Stream</em> a partir de los valores de entrada.</td></tr><tr><td><strong>IntStream.range(int, int)</strong></td><td>Stream de enteros entre los dos valores dados como parámetros de entrada.</td></tr><tr><td><strong>Stream.generate(IntSuppliert)</strong></td><td>Stream generado por un <a href="https://davidfuentes.blog/2019/03/11/java-8-interfaces-funcionales/?id=181#interfaz-supplier">proveedor de resultados.</a><br>Ejemplo<em>:<br>Stream.generate(new Random()::nextInt)<br></em><br></td></tr><tr><td><strong>Stream.iterate(int, IntUnaryOperator)</strong></td><td>El método <em>Iterate</em>() utiliza un valor como semilla para generar el <em>Stream</em>.</td></tr></tbody></table>

### Operaciones intermedias

Las operaciones intermedias son operaciones que se aplican sobre la fuente de Stream definida. Estas operaciones no se ejecutan hasta que no se incluye una operación terminal en la secuencia de operaciones, que es la que causa que la cadena de operaciones se ejecute.

La mayoría de las operaciones intermedias reciben un parámetro ([interfaz funcional](https://davidfuentes.blog/2019/03/11/java-8-interfaces-funcionales/)) que define su comportamiento, generalmente utilizando expresiones lambda. Como resultado, **todas las operaciones intermedias devuelven un** _**Stream**_, para que se puedan seguir concatenando operaciones.

El comportamiento definido para estas operaciones debe ser **no interferentes** sobre la ejecución del _Stream_, esto significa que la ejecución de la operación actual no debe afectar al resto. También deben ser **stateless**, es decir, debe tratar cada ejecución independientemente, sin relacionar las ejecuciones entre sí.

Estos dos patrones de comportamiento permite que un _Stream_ pueda ser ejecutado de forma secuencial o paralela, sin necesidad de modificaciones, y definiendo su comportamiento en tiempo de ejecución.

Existen múltiples operaciones intermedias, a continuación veremos las más frecuentes.

#### Operaciones de filtrado y mapeado

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>distinct()</strong></td><td>Devuelve un <em>Stream </em>sin elementos duplicados.</td></tr><tr><td><strong>filter(Predicate)</strong></td><td>Devuelve un <em>Stream </em>únicamente con los elementos que devuelven <em>true</em> al <em>Predicate</em> definido.</td></tr><tr><td><strong>map(Function)</strong></td><td>Devuelve un <em>Stream </em>en el cual se le aplica la función definida a cada uno de los elementos del <em>Stream</em> original.</td></tr><tr><td><strong>mapToInt(Function)</strong><br></td><td>Devuelve un <em>Stream </em>de enteros aplicando la función definida a cada uno de los elementos del <em>Stream </em>original.</td></tr><tr><td><strong>mapToDouble(Function)</strong></td><td>Devuelve un <em>Stream </em>de <em>Double</em>s aplicando la función definida a cada uno de los elementos del <em>Stream </em>original.</td></tr><tr><td><strong>mapToLong(Function)</strong></td><td>Devuelve un <em>Stream </em>de <em>Long</em>s aplicando la función definida a cada uno de los elementos del <em>Stream </em>original.</td></tr></tbody></table>

Además de las operaciones anteriores, existe un tipo de mapeado que devuelve múltiples resultados por cada valor procesado, este tipo de mapeado se denomina **_FlatMap_.** En la siguiente imagen se puede distinguir fácilmente la diferencia entre los _Maps_ y los _FlatMaps_.

![FlatMap vs Map](https://lh6.googleusercontent.com/5SQZyuBcZlUXKJC2ukGhlqpyCRQm_y4QNJ4MpnQ8Y6VrUE9oayRB2JQrHE-iwayF8wXgUtUvDf2m4J_UtwGn7epFh6fOIWR_8EZTQfpGcRO595eZrywzflt-VxfWr0ARdVvdERwL-Ws3pJEB_w)

Un ejemplo práctico sería el siguiente, en el cual creamos un _Stream_ a partir de un String, haciendo un split por la coma utilizando el método _FlatMap._

Este método nos genera un nuevo _Stream_ a partir de cada uno de los resultados obtenidos que podemos seguir procesando.

```java
public static void main(String\[\] args) {

    Stream.of("Some, Comma, Separated, Values")
                .flatMap(string -> Stream.of(string.split(",")))
                .map(string -> string.trim())
                .forEach(System.out::println);
}
```

#### Operaciones de restricción de tamaño

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>skip(Long n)</strong></td><td>Devuelve un <em>Stream</em> que ignora los primeros <strong><em>n</em></strong> elementos de la fuente de datos.</td></tr><tr><td><strong>limit(Long n)</strong></td><td>Devuelve un <em>Stream </em>que contiene los primeros <strong><em>n</em></strong> elementos de la fuente de datos.</td></tr></tbody></table>

#### Operaciones de ordenación y desordenación

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>sorted()</strong></td><td>Devuelve un <em>Stream </em>ordenado por <a href="http://The natural order in java means an order in which primitive or Object should be orderly sorted in given array or collection.">ordenación natural</a>. La ordenación natural es el orden el que un objeto primitivo debe ordenarse en una colección.</td></tr><tr><td><strong>sorter(Comparator)</strong></td><td>Devuelve un <em>Stream </em>ordenado mediante el Comparator recibido como parámetro de entrada.</td></tr><tr><td><strong>Unordered()</strong></td><td>Devuelve un <em>Stream</em> desordenado. Puede mejorar la eficiencia de otras operaciones como <em>distinct()</em> o <em>groupingBy()</em>.</td></tr></tbody></table>

#### Observando los elementos de un _Stream_

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>peek(Consumer)</strong></td><td>Devuelve un <em>Stream </em>idéntico al <em>Stream</em> del data source, aplicando la acción del Consumer a cada uno de los elementos.<br><br>El método peek() no debería modificar los elementos del <em>Stream</em>.<br><br>Generalmente utilizado para debugear.</td></tr></tbody></table>

### Operaciones terminales

Las operaciones terminales son las que terminan el pipeline de operaciones de un _Stream_ y activan su ejecución. **Un** _**Stream**_ **solo se ejecutará cuando el pipeline incluya una de estas operaciones**.

Al interpretar cómo se debe ejecutar la secuencia de operaciones del _Stream_, se aplican procesos de optimización para mergear o rechazar operaciones innecesarias, eliminar operaciones redundantes o ejecutar el stream en paralelo si fuera necesario.

Las operaciones terminales generan un valor o una acción como resultado, esto hace que este tipo de operaciones cierren la cadena de ejecución, ya que no devuelve un _Stream_.

Las operaciones terminales más comunes son las siguientes:

#### Operaciones condicionales

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>Optional&lt;T&gt; findFirst(Predicate)</strong></td><td>Devuelve el primer elemento del <em>Stream </em>que coincida con la condición del predicado, o un Optional vacío si no se cumple la condición.</td></tr><tr><td><strong>Optional&lt;T&gt; findAny(Predicate)</strong></td><td>Devuelve un elemento aleatorio del <em>Stream </em>que coincida con la condición del predicado, o un Optional vacío si no se cumple la condición. Pensado para ofrecer un mayor rendimiento en operaciones paralelas.</td></tr><tr><td><strong>Boolean allMatch(Predicate)</strong></td><td>Devuelve <strong><em>true</em></strong> si la condición del predicado se cumple para <strong>todos</strong> los elementos del Stream, <strong><em>false</em></strong> para el resto de casos.</td></tr><tr><td><strong>Boolean anyMatch(Predicate)</strong></td><td>Devuelve <strong><em>true</em></strong> si la condición del predicado se cumple para <strong>cualquier</strong> elemento del Stream, <strong><em>false</em></strong> para el resto de casos.</td></tr><tr><td><strong>Boolean noneMatch(Predicate)</strong></td><td>Devuelve <strong><em>true</em></strong> si la condición del predicado <strong>no</strong> se cumple para <span style="background-color:rgb(232,234,235);"><b>ningún</b></span>elemento del Stream, <strong><em>false</em></strong> para el resto de casos.</td></tr></tbody></table>

#### Operaciones que devuelve colecciones

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>collect(Collector)</strong></td><td>Devuelve el Stream en forma de colección del tipo que definamos. Podemos utilizar la clase de utilidad <a href="https://docs.oracle.com/javase/8/docs/api/java/util/stream/Collectors.html">Collectors</a>, que nos ofrece varias implementaciones de la interfaz Collector.</td></tr><tr><td><br><strong>toArray()</strong></td><td>Devuelve los elementos del <em>Stream </em>a modo de Array.</td></tr></tbody></table>

#### Operaciones que devuelve resultados numéricos

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>count()</strong></td><td>Devuelve un entero con el número de elementos que contiene el <em>Stream</em>.</td></tr><tr><td><strong>max(Comparator)</strong></td><td>Devuelve el valor más grande que contenga el <em>Stream</em>. Podemos definir el comparador que vamos a utilizar.</td></tr><tr><td><strong>min(Comparator)</strong></td><td>Devuelve el valor más pequeño que contenga el <em>Stream</em>. Podemos definir el comparador que vamos a utilizar.</td></tr><tr><td><strong>average()</strong></td><td>Devuelve la media aritmética del <em>Stream</em>.</td></tr><tr><td><strong>sum()</strong></td><td>Devuelve la suma de los elementos del <em>Stream</em>.</td></tr></tbody></table>

#### Operaciones de iteración

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>forEach(Consumer)</strong></td><td>Ejecuta la acción definida en el consumidor a cada elemento del <em>Stream</em>.</td></tr><tr><td><strong>forEach(Consumer)</strong></td><td>Realiza la misma acción que <em>forEach()</em> pero asegurando que el orden de ejecución se mantiene cuando se usa con <em>Streams </em>ejecutados de forma paralela.</td></tr></tbody></table>

#### Operaciones de reducción

<table class="wp-block-table is-style-stripes"><tbody><tr><td><strong>reduce(BinaryOperator accumulator)</strong></td><td>Realiza una reducción en el <em>Stream</em> utilizando un BinaryOperator.<br><br>El <em>BinaryOperator </em>recibe dos parámetros de entrada: el primero es el valor ya reducido, y el segundo es el valor a reducir.<br>Esta acción se aplica a cada uno de los elementos del <em>Stream</em>.<br></td></tr></tbody></table>

