<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="ville_pierre" tilewidth="16" tileheight="16" tilecount="112" columns="16">
 <!-- Pavés de la place, pierre de taille, dalles, cailloux -->
 <image source="ville_pierre.png" width="256" height="112"/>
  <tile id="0"><properties><property name="nom" value="herbe"/></properties></tile>
  <tile id="1"><properties><property name="nom" value="herbe_place_1"/></properties></tile>
  <tile id="2"><properties><property name="nom" value="herbe_place_2"/></properties></tile>
  <tile id="3"><properties><property name="nom" value="herbe_place_3"/></properties></tile>
  <tile id="4"><properties><property name="nom" value="herbe_place_4"/></properties></tile>
  <tile id="5"><properties><property name="nom" value="herbe_place_5"/></properties></tile>
  <tile id="6"><properties><property name="nom" value="herbe_place_6"/></properties></tile>
  <tile id="7"><properties><property name="nom" value="herbe_place_7"/></properties></tile>
  <tile id="8"><properties><property name="nom" value="herbe_place_8"/></properties></tile>
  <tile id="9"><properties><property name="nom" value="herbe_place_9"/></properties></tile>
  <tile id="10"><properties><property name="nom" value="herbe_place_10"/></properties></tile>
  <tile id="11"><properties><property name="nom" value="herbe_place_11"/></properties></tile>
  <tile id="12"><properties><property name="nom" value="herbe_place_12"/></properties></tile>
  <tile id="13"><properties><property name="nom" value="herbe_place_13"/></properties></tile>
  <tile id="14"><properties><property name="nom" value="herbe_place_14"/></properties></tile>
  <tile id="15"><properties><property name="nom" value="place_0"/></properties></tile>
  <tile id="16"><properties><property name="nom" value="place_1"/></properties></tile>
 <wangsets>
  <wangset name="herbe / place" type="corner" tile="15">
   <wangcolor name="herbe" color="#86a534" tile="0" probability="1"/>
   <wangcolor name="place" color="#a2a0a4" tile="15" probability="1"/>
   <wangtile tileid="0" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="1" wangid="0,1,0,2,0,1,0,1"/>
   <wangtile tileid="2" wangid="0,1,0,1,0,2,0,1"/>
   <wangtile tileid="3" wangid="0,1,0,2,0,2,0,1"/>
   <wangtile tileid="4" wangid="0,2,0,1,0,1,0,1"/>
   <wangtile tileid="5" wangid="0,2,0,2,0,1,0,1"/>
   <wangtile tileid="6" wangid="0,2,0,1,0,2,0,1"/>
   <wangtile tileid="7" wangid="0,2,0,2,0,2,0,1"/>
   <wangtile tileid="8" wangid="0,1,0,1,0,1,0,2"/>
   <wangtile tileid="9" wangid="0,1,0,2,0,1,0,2"/>
   <wangtile tileid="10" wangid="0,1,0,1,0,2,0,2"/>
   <wangtile tileid="11" wangid="0,1,0,2,0,2,0,2"/>
   <wangtile tileid="12" wangid="0,2,0,1,0,1,0,2"/>
   <wangtile tileid="13" wangid="0,2,0,2,0,1,0,2"/>
   <wangtile tileid="14" wangid="0,2,0,1,0,2,0,2"/>
   <wangtile tileid="15" wangid="0,2,0,2,0,2,0,2"/>
  </wangset>
 </wangsets>
</tileset>
