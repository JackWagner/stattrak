package main

import "fmt"

func main() {
	fmt.Println("Enter a temp in F:")
	var farhenheit float64
	fmt.Scanf("%f", &farhenheit)

	celsius := (farhenheit - 32) * 5 / 9

	fmt.Println(celsius)

}
