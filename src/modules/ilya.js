import { onMount, onDestroy, onPageIn, onPageOut } from "@/modules/_";

export default function (element, dataset) {
  console.log("ilya", element, dataset);

  onMount(() => {
    console.log("ilya mounted");
  });

  onDestroy(() => {
    console.log("ilya destroyed");
  });

  onPageIn(() => {
    console.log("ilya page in");
  });

  onPageOut(() => {
    console.log("ilya page out");
  });
}
