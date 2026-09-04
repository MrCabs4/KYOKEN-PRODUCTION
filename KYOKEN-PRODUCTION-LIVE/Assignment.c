/*Write a C program that asks the user to enter two integers. Compare the two numbers and display the results of the following:
First number is greater than second number. 
First number is less than second number. 
First number is equal to second number. 
First number is not equal to second number.*/

#include<stdio.h>

int main()
{
    int number1, number2;
    
    printf("Enter First Number");
    scanf("%d", &number1);
    printf("Enter Second Number");
    scanf("%d", &number2);
    
    printf("\nFirst number is greater than second number:\t%d", number1 > number2);
    printf("\nFirst number is less than second number:\t%d", number1 < number2);
    printf("\nFirst number is equal to second number:\t%d", number1 == number2);
    printf("\nFirst number is not equal to second number:\t%d", number1 != number2);
    
    return 0;
}