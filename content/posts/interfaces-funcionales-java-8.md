---
title: "Java 8: Interfaces funcionales."
date: "2019-03-11"
draft: false

categories:
  - "java"
tags:
  - "functional-interfaces"
---

Las interfaces funcionales son todas aquellas interfaces que definen un único método abstracto, pudiendo implementar uno o varios métodos **_default_** o **_static_**.

Este nuevo tipo de interfaces son especialmente importantes debido a que son la base de la implementación de las nuevas [expresiones lambda](https://davidfuentes.blog/2019/02/03/java-8-expresiones-lambda/), una de las funcionalidades más importantes de Java 8.

A continuación podemos ver un ejemplo de interfaz funcional, en la que se define un único método abstracto, y varios métodos **_default_** y **_static_**:

public interface Calculator {
    // My abstract method
    String calculate(int arg1, int arg2);

    // Default method
    default int sum(int arg1, int arg2) {
        return arg1 + arg2;
    }

    // Static method
    static int floatToInt(float arg) {
        return Math.round(arg);
    }
}

Para asegurarnos de que nuestra interfaz funcional está bien implementada, Java 8 ha incluido una anotación que nos permite verificarlo, para ello deberemos incluir la anotación **_@FunctionalInterface_** a nivel de la clase.

Esta anotación es procesada por nuestro IDE, y nos marcará si la interfaz está correctamente implementada.

@FunctionalInterface
public interface Calculator {
    // My abstract method
    String calculate(int arg1, int arg2);
}

## Ejemplos de interfaces funcionales incluidas en Java 8

Java 8 incluye múltiples interfaces funcionales que podemos utilizar para crear expresiones lambda, y que son muy utilizadas en la API de Streams de Java. Podemos encontrar estas interfaces en el paquete **_[java.util.function.](https://docs.oracle.com/javase/8/docs/api/java/util/function/package-summary.html)_**

Sin entrar en cada una de ellas, a continuación os dejo ejemplos de las interfaces nuevas que se han incluido en la versión de Java 8.

### Interfaces Consumer<T> y BiConsumer<T,U>

Las interfaces **Consumer** y **BiConsumer** representan una operación que recibe uno y dos valores respectivamente, y no devuelven ningún resultado.

@FunctionalInterface
public interface Consumer<T> {
    void accept(T t);

    default Consumer<T> andThen(Consumer<? super T> after) {
        Objects.requireNonNull(after);
        return (T t) -> { accept(t); after.accept(t); };
    }
}

@FunctionalInterface
public interface BiConsumer<T,U> {
    void accept(T t, U u);

    default BiConsumer<T,U> andThen(BiConsumer<? super T,? super U> after) {
        Objects.requireNonNull(after);
        return (T t, U u) -> { accept(t,u); after.accept(t,u); };
    }
}

### Interfaz Supplier<T>

La interfaz **Supplier** representa un proveedor de resultados, sin parámetros de entrada y con un parámetro de salida.

@FunctionalInterface
public interface Supplier<T> {
    T get();
}

### Interfaces Function<T> y BiFunction<T,U>

Las interfaces **Function** y **BiFunction** representan una función que recibe uno y dos valores respectivamente, y produce un valor como resultado.

@FunctionalInterface
public interface Function<T,R> {
    R apply(T t);

    default <V> Function<V, R> compose(Function<? super V, ? extends T> before) {
        Objects.requireNonNull(before);
        return (V v) -> apply(before.apply(v));
    }

    default <V> Function<T, V> andThen(Function<? super R, ? extends V> after) {
        Objects.requireNonNull(after);
        return (T t) -> after.apply(apply(t));
    }

    static <T> Function<T, T> identity() {
        return t -> t;
    }
}

@FunctionalInterface
public interface BiFunction<T, U, R> {
    R apply(T t, U u);

    default <V> BiFunction<T, U, V> andThen(Function<? super R, ? extends V> after) {
        Objects.requireNonNull(after);
        return (T t, U u) -> after.apply(apply(t, u));
    }
}

### Interfaz UnaryOperator

La interfaz **UnaryOperator** representa una operación en la cual se recibe un parámetro de entrada, y se devuelve un valor del mismo tipo como resultado.

@FunctionalInterface
public interface UnaryOperator<T> extends Function<T, T> {
    static <T> UnaryOperator<T> identity() {
        return t -> t;
    }
}

### Interfaz BinaryOperator

La interfaz **BinaryOperator** representa una operación en la cual se reciben dos parámetro de entrada del mismo tipo, y se devuelve un valor del mismo tipo como resultado.

@FunctionalInterface
public interface BinaryOperator<T> extends BiFunction<T,T,T> {
    public static <T> BinaryOperator<T> minBy(Comparator<? super T> comparator) {
        Objects.requireNonNull(comparator);
        return (a, b) -> comparator.compare(a, b) <= 0 ? a : b;
    }

    public static <T> BinaryOperator<T> maxBy(Comparator<? super T> comparator) {
        Objects.requireNonNull(comparator);
        return (a, b) -> comparator.compare(a, b) >= 0 ? a : b;
    }
}

### Interfaces Predicate y BiPredicate

Las interfaces **Predicate** y **BiPredicate** representan funciones que devuelven un booleano como resultado, y reciben uno y dos parámetros de entrada respectivamente.

@FunctionalInterface
public interface Predicate<T> {
    boolean test(T t);

    default Predicate<T> and(Predicate<? super T> other) {
        Objects.requireNonNull(other);
        return (t) -> test(t) && other.test(t);
    }

    default Predicate<T> negate() {
        return (t) -> !test(t);
    }

    default Predicate<T> or(Predicate<? super T> other) {
        Objects.requireNonNull(other);
        return (t) -> test(t) || other.test(t);
    }

    static <T> Predicate<T> isEqual(Object targetRef) {
        return (null == targetRef)
                ? Objects::isNull
                : object -> targetRef.equals(object);
    }
}

@FunctionalInterface
public interface BiPredicate<T, U> {
    boolean test(T t, U u);

    default BiPredicate<T, U> and(BiPredicate<? super T, ? super U> other) {
        Objects.requireNonNull(other);
        return (T t, U u) -> test(t, u) && other.test(t, u);
    }

    default BiPredicate<T, U> negate() {
        return (T t, U u) -> !test(t, u);
    }

    default BiPredicate<T, U> or(BiPredicate<? super T, ? super U> other) {
        Objects.requireNonNull(other);
        return (T t, U u) -> test(t, u) || other.test(t, u);
    }
}
