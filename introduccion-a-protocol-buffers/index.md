# Introducción a Protocol Buffers


**_Protocol Buffers_** es el mecanismo diseñado por Google para serializar y deserializar datos estructurados. Google decidió crear este mecanismo como alternativa a XML o JSON, en busca de una forma más eficiente de serializar y deserializar los datos.

Protocol Buffer o Protobuf, es agnóstico del lenguaje y la plataforma utilizados para implementarlo, y está creado para ser extensible, lo que facilita la evolución y mantenimiento de este el la vida de un proyecto. Sin embargo, una de las desventajas con respecto a XML o JSON, es que el número de lenguajes en el que podemos utilizarlo está limitado a los lenguajes que el [compilador tiene implementados](https://developers.google.com/protocol-buffers/docs/tutorials).

Su funcionamiento es sencillo, se define un fichero ‘**.proto**’ que contiene el esquema con el que queremos que los datos sean estructurados, y mediante el compilador que nos ofrece el equipo de Protocol Buffers para los distintos lenguajes, generamos las clases necesarias para implementar dicho esquema, y que nos permite serializar y deserializar mensajes de forma nativa.

La sintaxis de Protocol Buffers es sencilla, empecemos por el ejemplo más simple, definir un mensaje.

## Elemento Message

'_**message**_' es el elemento que nos permite definir la estructura de datos que utilizar en nuestras comunicaciones.

Un fichero ‘**.proto**’ puede tener uno o varios elementos '_**message**_', además de enumerados y comentarios como veremos más adelante.

```protobuf
syntax = "proto3";

message SearchRequest {
  string query = 1;
  int32 page\_number = 2;
  int32 result\_per\_page = 3;
  enum Corpus {
    UNIVERSAL = 0;
    WEB = 1;
    IMAGES = 2;
    LOCAL = 3;
    NEWS = 4;
    PRODUCTS = 5;
    VIDEO = 6;
  }
  Corpus corpus = 4;
}
```

La primera línea del ejemplo define qué sintaxis vamos a utilizar, en este caso estamos definiendo que utilizaremos la sintaxis de la versión [v3](https://developers.google.com/protocol-buffers/docs/proto3). Si omitimos esta línea, el compilador asumirá que estamos utilizando la versión [v2](https://developers.google.com/protocol-buffers/docs/proto).

La estructura que le sigue define el esquema que queremos que tengan nuestro elemento '**_message_**'. Para ello utilizamos la palabra reservada ‘**_message_**’ para definir que queremos crear una estructura de datos que compondrá un mensaje, y definimos el nombre de la estructura de datos como ‘**_SearchRequest_**’.

Una vez señalado el tipo de elemento que estamos definiendo, incluimos los datos que va a contener con el formato que veremos a continuación.

### Numeración

Los campos de las estructuras de datos están numerados. Esta numeración se utiliza para identificar los campos una vez el mensaje está serializado, y no deberían cambiar una vez la estructura de datos está en uso, ya que puede derivar en errores de deserialización.

La numeración debe ser **única**, es decir, no puede haber índices repetidos, ya que de lo contrario el compilador nos lanzará un error.

El índice de datos que podemos utilizar va desde el 1 al $2^{29} - 1$, estando reservados para uso interno de Protocol Buffers los índices del 19000 al 19999.

Tal y como se especifica en la documentación, los índices del 1 al 15 ocupan un byte de espacio, mientras que los índices del 16 al 2047 ocupan 2 bytes, por lo que deberíamos reservar los primeros 15 índices para campos que se utilizan muy frecuentemente en la estructura de datos. Esto hará que las los procesos de serialización y deserialización sean más eficientes.

Esto significa que, pensando en la evolución que pueda tener el **_proto_**, deberíamos dejar cierto espacio de índices reservado para futuros campos a los que se les pueda llegar a dar mucho uso, utilizando para campos menos frecuentes los índices del 16 en adelante.

Todos los campos de un mensaje pueden anotarse con las palabras clave **‘singular’** y **‘repeated’**, que definen que el campo puede aparecer una o varias veces, respectivamente. A su vez, cada uno de los campos de la estructura de datos deberá definir el tipo, tal y como veremos a continuación.

### Tipos de campos

Los datos de una estructura de datos pueden ser de uno de los siguientes tipos:

<table><tbody><tr><td><strong>Tipo en '.proto'</strong></td><td><strong>Tipo en Java</strong></td><td><strong>Valores por defecto</strong></td></tr><tr><td>float</td><td>float</td><td>0</td></tr><tr><td>int32, uint32, sint32, sfixed32</td><td>int</td><td>0</td></tr><tr><td>int64, uint64, sint64, sfixed64</td><td>long</td><td>0</td></tr><tr><td>bool</td><td>bool</td><td>false</td></tr><tr><td>string</td><td>String</td><td>String vacío</td></tr><tr><td>Bytes</td><td>ByteString</td><td>ByteString vacío</td></tr></tbody></table>

Para saber más acerca de los tipos de datos y su codificación, podéis acceder a la [documentación oficial](https://developers.google.com/protocol-buffers/docs/encoding).

### Campos reservados

En los campos de un mensaje, al igual que en los enumerados, los índices se pueden reservar utilizando la siguiente sintaxis.

```protobuf
message Foo {
  reserved 2, 15, 9 to 11;
  reserved "foo", "bar";
}
```

Podemos reservar tanto campos numéricos como textos, pero nunca mezclandolos en la misma línea.

### Estructuras de datos como campos

Las estructuras de datos pueden contener, a su vez, otras estructuras de datos:

```protobuf
message SearchResponse {
  repeated Result results = 1;
}

message Result {
  string url = 1;
  string title = 2;
  repeated string snippets = 3;
}
```

Para ello, podemos definir la estructura que vamos a utilizar como campo, y una vez definida, añadirla a otra estructura de datos, como en el ejemplo anterior.

Además, vemos como en el ejemplo se define el campo con la palabra ‘**_repeated_**’. Esta opción permite definir el campo anotado como un array de datos, y se puede utilizar con cualquier tipo definido en los apartados anteriores.

#### Estructuras anidadas

Siguiendo la misma lógica anterior, también podemos definir estructuras anidadas dentro de otras estructuras de datos, sin la necesidad de implementar las estructuras por separado, fuera del propio '**_message_**' contenedor:

```protobuf
message SearchResponse {
  message Result {
    string url = 1;
    string title = 2;
    repeated string snippets = 3;
  }
  repeated Result results = 1;
}
```

Uno de los aspectos que diferencia una estructura anidada, es que si queremos hacer uso de esta en otras estructuras, deberemos definirla de la siguiente manera:

```protobuf
message SomeOtherMessage {
  SearchResponse.Result result = 1;
}
```

Se pueden anidar tantas estructuras de datos como se quieran, Protocol Buffers no define ningún límite en la anidación.

## Importando '**.proto**'s

Protocol Buffers nos permite reutilizar los esquemas definidos mediante la importación de ‘**.proto**’s.

Para realizar una importación, solo tendremos que definir la siguiente línea en la cabecera del ‘**.proto**’ actual, y una vez importado, podremos utilizar los message definidos:

```protobuf
import "myproject/other\_protos.proto";
```

## Comentarios en ficheros ‘**.proto**’

Los ficheros **_‘.proto’_** se pueden comentar con la sintaxis habitual de Java, utilizando _**//**_ y _**/\* ... \*/**_.

Estos comentarios se convertirán a comentarios del lenguaje seleccionado, documentando las clases generadas para facilitar su utilización.

```protobuf
/\* SearchRequest represents a search query, with pagination options to indicate which results to include in the response. \*/

message SearchRequest {
  string query = 1;
  int32 page\_number = 2;  // Which page number do we want?
  int32 result\_per\_page = 3;  // Number of results to return per page.
}
```

## Enumerados

Los campos definidos en un '**_message_**' también pueden ser de tipo enumerados, que podemos crear tanto en la propia estructura de datos, como fuera de estas, como un elemento separado.

Un ejemplo de definición de los enumerados es la siguiente:

```protobuf
enum Corpus {
    UNIVERSAL = 0;
    WEB = 1;
    IMAGES = 2;
    LOCAL = 3;
    NEWS = 4;
    PRODUCTS = 5;
    VIDEO = 6;
}
```

Al igual que los campos de una estructura de datos, los campos de los enumerados también están numerados, por los mismos motivos, pero con algunas diferencias.

La diferencia más relevante es que un enumerado **siempre** deberá tener un elemento con la numeración **_0_**. Esto es debido a que este valor se utilizará como valor por defecto, además de utilizarse para la retrocompatibilidad con la versión 2 de Protocol Buffers.

La problemática más habitual en enumerados y elementos '**_message_**' es la retrocompatibilidad de estos en las actualizaciones que eliminan uno o varios campos. Esto es debido a que al eliminar un campo, liberamos la numeración de este para poder ser utilizada por otro campo distinto, y esto puede llegar a causar conflictos de serialización entre versiones.

Para darle una solución, Protocol Buffers permite reservar el uso de ciertos valores mediante la palabra reservada ‘_**reserved**_’, con la cual podemos definir qué valores, ya sean numéricos o strings, queremos reservar para que no puedan ser utilizados en futuras actualizaciones. De esta manera restringimos los valores que podemos utilizar y aseguramos la retrocompatibilidad entre versiones.

```protobuf
enum Foo {
  reserved 2, 15, 9 to 11, 40 to max;
  reserved "FOO", "BAR";
}
```

### Aliases

Los enumerados tienen otra particularidad, y es que permiten utilizar aliases. Los aliases son valores con el mismo índice que nos devolverán el mismo valor una vez implementados, pero manteniendo distinto texto.

Para utilizarlos tenemos que habilitarlos en el propio enumerado de la siguiente manera, de lo contrario el compilador nos lanzará un error al detectar numeración duplicada:

```protobuf
enum EnumAllowingAlias {
  option allow\_alias = true;
  UNKNOWN = 0;
  STARTED = 1;
  RUNNING = 1;
}
```

Una vez habilitados, podremos definir varios elementos con la misma numeración, que se podrán utilizar como aliases para definir un mismo valor. En el caso anterior, los campos _STARTED_, y _RUNNING_ tienen el mismo valor en el enumerado.

## Otros comandos

Además de los tipos básicos, Protocol Buffers nos ofrece ciertos comandos más complejos con los que podemos añadir cierta lógica y condicionamiento a los '**_message_**'.

### oneOf

La palabra reservada ‘**oneOf**’ se utiliza para definir que, de un conjunto de campos, solo uno de ellos debe ser definido al mismo tiempo. Cuando se define un valor para uno de los campos dentro de esta estructura, se borra el valor del resto de campos que contiene.

```protobuf
message SampleMessage {
  oneof test\_oneof {
    string name = 4;
    SubMessage sub\_message = 9;
  }
}
```

Para saber cual de los campos ha sido el que se ha definido, Protocol Buffers implementado dos métodos que nos dan esta información en la compilación de las clases, el método _**case()**_ y el método _**WhichOneOf()**_.

Una de las limitaciones de esta funcionalidad, es que no se pueden utilizar campos de tipo **repeated**.

### Maps

Protocol Buffers permite definir mapas de datos mediante la siguiente sintaxis:

```protobuf
map<key\_type, value\_type> map\_field = N;
```

Donde:

- **Key\_type**: Puede ser cualquier tipo de entero o string.
- **Value\_type**: Puede ser cualquier tipo, excepto otro mapa.

Por otro lado, los campos de un mapa no pueden ser de tipo ‘**repeated**’, y el mapa no tiene porque guardar el orden original en el que se insertaron los datos.

### Servicios

De querer utilizar los protos definidos en un sistema de RPC, Protocol Buffers permite definir un servicio que especifica el contrato que se deberá cumplir para poder utilizar el mensaje con el protocolo RPC.

```protobuf
service SearchService {
  rpc Search (SearchRequest) returns (SearchResponse);
}
```

La implementación del protocolo de comunicaciones RPC más común a utilizar con Protocol Buffers es gRPC, un sistema RPC agnóstico de lenguaje y plataforma, también creado por Google, que permite generar el código necesario para la comunicación RPC directamente en la compilación de los ficheros ‘**_.proto_**’.

Si somos muy puristas, podemos definir nuestra propia implementación para la comunicación RPC siguiendo [esta guía](https://developers.google.com/protocol-buffers/docs/proto#services).

### Mapeo JSON

Protocol Buffers nos permite mapear nuestros datos al formato JSON para facilitar la exportación e importación de datos, además de facilitar la integración con servicios externos.

### Opciones dentro del Proto

Además de la definición de la sintaxis, existen otras opciones disponibles para los ficheros ‘**.proto**’:

- **Option java\_package**: define el package en el que se generarán las clases compiladas.
- **Option java\_multiple\_files**: Permite que las clases se generen en clases separadas dentro del package definido, en vez de generarse en clases abstractas dentro de una clase principal.
- **Option java\_outer\_classname**: Nombre de la clase principal que contendrá, si no se define lo contrario, todas las clases generadas a partir del fichero de ‘.proto’. Si no se define ningun valor, este se recogerá de la conversión a Camel Case del nombre del fichero de ‘.proto’.
- **Option optimize\_for**: Permite definir la optimización del código generado para: La velocidad (SPEED), el tamaña de código (CODE\_SIZE) o el uso de la librería Lite de Protocol Buffers (LITE\_RUNTIME).
- **Int32 old\_field = 4 \[deprecated=true\]**: Marca como deprecado el campo marcado.

## Compilando el ‘**.proto**’ y generando código

Para generar el código a partir del fichero ‘**_.proto_**’, deberemos utilizar la opción pertinente para cada lenguaje en el compilador. El comando para la compilación y generación de código es el siguiente, en el que podemos ver los distintos lenguajes soportados:

```bash
protoc --proto\_path=IMPORT\_PATH --cpp\_out=DST\_DIR --java\_out=DST\_DIR --python\_out=DST\_DIR --go\_out=DST\_DIR --ruby\_out=DST\_DIR --objc\_out=DST\_DIR --csharp\_out=DST\_DIR path/to/file.proto
```

Donde:

- **IMPORT\_PATH:** Define el path donde el compilador buscará los ficheros ‘**.proto**’.
- **\*\_output**: Define los paths de salida para el código generado para los múltiples lenguajes soportados por el compilador.

