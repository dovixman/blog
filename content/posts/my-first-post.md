---
title: "My First Post :joy:"
date: 2020-03-06T21:29:01+08:00
lastmod: 2020-03-06T21:29:01+08:00
draft: false
twemoji: true
linkToMarkdown: false

tags: ["test", "test-features"]
categories: ["Tests"]
---


## Emojis
This is some test content with emojis! :joy:

## Code from GitHub gist

{{< gist spf13 7896402 >}}

## Code with syntax highligh

{{< highlight java >}}
public static void main(String[] args){
   System.out.println("Hello world!");
}
{{< /highlight >}}

{{< highlight python >}}
def main:
   print("Hello World!")
{{< /highlight >}}


## Tweets
{{< tweet 1542566710594658312 >}}

## Youtube videos
{{< youtube msMgrg3EHMY >}}

## Admonition note styles
{{< admonition note "Note" false >}}
Some banner
{{< /admonition >}}
{{< admonition abstract "Abstract" false >}}
Some banner
{{< /admonition >}}
{{< admonition info "Info" false >}}
Some banner
{{< /admonition >}}
{{< admonition tip "Tip" false >}}
Some banner
{{< /admonition >}}
{{< admonition success "Success" false >}}
Some banner
{{< /admonition >}}
{{< admonition question "Question" false >}}
Some banner
{{< /admonition >}}
{{< admonition warning "Warning" false >}}
Some banner
{{< /admonition >}}
{{< admonition failure "Failure" false >}}
Some banner
{{< /admonition >}}
{{< admonition danger "Danger" false >}}
Some banner
{{< /admonition >}}
{{< admonition bug "Bug" false >}}
Some banner
{{< /admonition >}}
{{< admonition example "Example" false >}}
Some banner
{{< /admonition >}}
{{< admonition quote "Quote" false >}}
Some banner
{{< /admonition >}}

## Echarts for data visualization :heart:
{{< echarts >}}
{
  "title": {
    "text": "Summary Line Chart",
    "top": "2%",
    "left": "center"
  },
  "tooltip": {
    "trigger": "axis"
  },
  "legend": {
    "data": ["Email Marketing", "Affiliate Advertising", "Video Advertising", "Direct View", "Search Engine"],
    "top": "10%"
  },
  "grid": {
    "left": "5%",
    "right": "5%",
    "bottom": "5%",
    "top": "20%",
    "containLabel": true
  },
  "toolbox": {
    "feature": {
      "saveAsImage": {
        "title": "Save as Image"
      }
    }
  },
  "xAxis": {
    "type": "category",
    "boundaryGap": false,
    "data": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  },
  "yAxis": {
    "type": "value"
  },
  "series": [
    {
      "name": "Email Marketing",
      "type": "line",
      "stack": "Total",
      "data": [120, 132, 101, 134, 90, 230, 210]
    },
    {
      "name": "Affiliate Advertising",
      "type": "line",
      "stack": "Total",
      "data": [220, 182, 191, 234, 290, 330, 310]
    },
    {
      "name": "Video Advertising",
      "type": "line",
      "stack": "Total",
      "data": [150, 232, 201, 154, 190, 330, 410]
    },
    {
      "name": "Direct View",
      "type": "line",
      "stack": "Total",
      "data": [320, 332, 301, 334, 390, 330, 320]
    },
    {
      "name": "Search Engine",
      "type": "line",
      "stack": "Total",
      "data": [820, 932, 901, 934, 1290, 1330, 1320]
    }
  ]
}
{{< /echarts >}}

## Maps visualization with mapbox

{{< mapbox -122.252 37.453 10 false "mapbox://styles/mapbox/navigation-preview-day-v4" "mapbox://styles/mapbox/navigation-preview-night-v4" >}}

## Custom scripts on page
{{< script >}}
console.log('Hello LoveIt!');
{{< /script >}}


## Typing animations
Text:
{{< typeit >}}
This is a *paragraph* with **typing animation** based on [TypeIt](https://typeitjs.com/)...
{{< /typeit >}}

Code:
{{< typeit code=java >}}
public class HelloWorld {
    public static void main(String []args) {
        System.out.println("Hello World");
    }
}
{{< /typeit >}}

Groups:
{{< typeit group=paragraph >}}
**First** this paragraph begins
{{< /typeit >}}

{{< typeit group=paragraph >}}
**Then** this paragraph begins
{{< /typeit >}}

## Print persons
{{< person url="https://evgenykuznetsov.org" name="Evgeny Kuznetsov" nick="nekr0z" text="author of this shortcode" picture="https://evgenykuznetsov.org/img/avatar.jpg" >}}
