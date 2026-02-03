import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormTab } from "./components/FormTab";
import { ExcelTab } from "./components/ExcelTab";
import { ExcelTabSplit2 } from "./components/ExcelTab-Split-2";

export default function ExpensesPage() {
  return (

    <Tabs defaultValue="excel" >
      <TabsList variant="line" className=" ">
        <TabsTrigger value="form">Form</TabsTrigger>
        <TabsTrigger value="excel">Excel</TabsTrigger>
        <TabsTrigger value="split">Excel - Advanced Split</TabsTrigger>
      </TabsList>

      <TabsContent value="form" className="mt-8">
        <FormTab />
      </TabsContent>

      <TabsContent value="excel" className="mt-8">
        <ExcelTab />
      </TabsContent>

      <TabsContent value="split" className="mt-8">
        <ExcelTabSplit2 />
      </TabsContent>
    </Tabs>
  );
}
